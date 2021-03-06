'use strict';

/**
 * @module image-generator
 * @author Alteh Union (alteh.union@gmail.com)
 * @license MIT (see the root LICENSE file for details)
 */

const TextToImage = require('text-to-image');
const Jimp = require('jimp');
const { Canvas } = require('canvas');
const request = require('request');
const fs = require('fs');
const crypto = require('crypto');

const FONT_SIZE_TO_LINE_HEIGHT = 1.1;
const JPEG_QUALITY = 95;
const FILE_CACHE_FOLDER = 'cache/';
const MAX_FONT_FILE_SIZE = 1024 * 1024; // 1 Mb

/**
 * Allows to generate new image based on baseImage using template rules.
 * @alias ImageGenerator
 */
class ImageGenerator {
  /**
   * Creates the manager's instance and registers necessary assets.
   * @param {Context} context the Bot's context
   */
  constructor(context) {
    this.context = context;
    Canvas._registerFont('assets/fonts/BebasNeue-Regular.ttf', { family: 'Bebas Neue' });
    Canvas._registerFont('assets/fonts/BebasNeue-Book.ttf', { family: 'Bebas Neue Book' });
    Canvas._registerFont('assets/fonts/BebasNeue-Light.ttf', { family: 'Bebas Neue Light' });
    Canvas._registerFont('assets/fonts/BebasNeue-Thin.ttf', { family: 'Bebas Neue Thin' });
  }

  /**
   * Main class method. Generates image based on provided template.
   * @param   {string}                   picUrl         the URL of the picture to make image from
   * @param   {Object}                   params         the addtional parameters to consider during the procedure
   * @param   {Object}                   templateConfig the template defined as a JSON
   * @returns {Promise<DepreciatedJimp>}                          the result image
   */
  async generateImage(picUrl, params, templateConfig) {
    const baseImg = await Jimp.read(picUrl);
    await this.prepareBaseImage(baseImg, params, templateConfig);
    await this.addFonts(templateConfig);
    if (templateConfig.items) {
      await this.composeImage(baseImg, templateConfig.items, params);
    }
    return baseImg;
  }

  /**
   * Deletes a file at a given path.
   * @private
   * @param  {string}  filePath the file path
   * @return {Promise}          nothing
   */
  async deleteFile(filePath) {
    await fs.unlink(filePath, (err) => {
      if (err) {
        this.context.log.e('Delete error: ' + err);
      } else {
        this.context.log.v(`File ${filePath} deleted successfully`);
      }
    });
  }

  /**
   * Downloads a file if it's content length is below a specified limit in bytes.
   * @private
   * @param  {string}  url           the URL of the remote file to be downloaded
   * @param  {string}  filePath      the local path to save the file into
   * @param  {Number}  fileSizeLimit the size limit in bytes
   * @return {Promise}               nothing
   */
  async downloadFileWithSizeLimit(url, filePath, fileSizeLimit) {
    this.context.log.d(`Download file ${url} to ${filePath}`);
    const downloadFunc = (url, filePath, resolve, reject) => {
      request({
        url: url,
        method: 'HEAD'
      }, (err, headRes) => {
        if (err) {
          this.context.log.e(`HEAD request failed for ${url}`);
          reject(err.message);
          return;
        }

        if (headRes.headers['content-length'] && headRes.headers['content-length'] > fileSizeLimit) {
          this.context.log.e('File size exceeds limit (' + headRes.headers['content-length'] + ')');
          reject('File size exceeds limit (' + headRes.headers['content-length'] + ')');

        } else {
          if (headRes.headers['content-length']) {
            this.context.log.v(`File size ${url} is ${headRes.headers['content-length']}`);
          }

          const file = fs.createWriteStream(filePath);
          const res = request({ url: url });
          let size = 0;

          res.on('response', (response) => {
            if (response.statusCode !== 200) {
              reject('Response status was ' + response.statusCode);
            }
          });

          res.on('error', (err) => {
            this.deleteFile(filePath);
            reject(err.message);
          });

          res.on('data', (data) => {
            size += data.length;
            if (size > fileSizeLimit) {
              this.context.log.e('Resource stream exceeded limit (' + size + ')');
              res.abort(); // Abort the response (close and cleanup the stream)
              this.deleteFile(filePath);
              reject('File size  exceeds limit');

            }
          }).pipe(file);

          file.on('error', (err) => { // Handle errors
            this.context.log.e(`ImageGenerator: File error ${err}`);
            this.deleteFile(filePath);
            reject(err.message);
          });

          file.on('finish', () => file.close(resolve));
        }
      });
    };
    return new Promise((resolve, reject) => downloadFunc(url, filePath, resolve, reject));
  }

  /**
   * Processes 'fonts' blocks of the image template config.
   * Tries to download and register declared fonts in the local system.
   * @private
   * @param   {Object}  templateConfig the image template defined as a JSON
   * @returns {Promise}                nothing
   */
  async addFonts(templateConfig) {
    if (templateConfig.fonts && Array.isArray(templateConfig.fonts)) {
      for (const font of templateConfig.fonts) {
        const fileName = crypto.createHash('md5').update(font.url).digest('hex');
        const filePath = FILE_CACHE_FOLDER + fileName;

        try {
          if (!fs.existsSync(filePath)) {
            await this.downloadFileWithSizeLimit(font.url, filePath, MAX_FONT_FILE_SIZE);
          }
          Canvas._registerFont(filePath, { family: font.name });

        } catch (error) {
          this.context.log.e(`ImageGenerator: Failed to download and include font ${font.url} with
          message: ${error}, stack: ${error.stack}`);
          throw error;
        }
      }
    }
  }


  /**
   * Prepares the base image according to the template requirements.
   * @private
   * @param   {DepreciatedJimp} baseImg        the base image
   * @param   {Object}          params         the parameters to be applied for the base image
   * @param   {Object}          templateConfig the image template defined as a JSON
   * @returns {Promise}                        nothing
   */
  async prepareBaseImage(baseImg, params, templateConfig) {
    await baseImg.quality(JPEG_QUALITY);

    if (templateConfig.input) {
      if (templateConfig.input.type === 'fixed') {
        const basePicRatio = baseImg.getWidth() / baseImg.getHeight();
        const inputRatio = templateConfig.input.width / templateConfig.input.height;
        if (basePicRatio <= inputRatio) {
          await baseImg.resize(templateConfig.input.width, Jimp.AUTO);
        } else {
          await baseImg.resize(Jimp.AUTO, templateConfig.input.height);
        }
        let x = (baseImg.getWidth() - templateConfig.input.width) / 2 + params.xShift || 0;
        let y = (baseImg.getHeight() - templateConfig.input.height) / 2 + params.yShift || 0;
        x = x < 0 ? 0 : x;
        y = y < 0 ? 0 : y;
        await baseImg.crop(x, y, templateConfig.input.width, templateConfig.input.height);
      }
    }
  }

  /**
   * Composes the resuot image from the base image using the template rules.
   * @private
   * @param   {DepreciatedJimp} baseImg        the base image
   * @param   {Array}           itemConfigList the image template defined as a JSON
   * @param   {Object}          params         the parameters to be applied for the base image
   * @returns {Promise}                        nothing
   */
  async composeImage(baseImg, itemConfigList, params) {
    for (const itemConfig of itemConfigList) {
      switch (itemConfig.type) {
        case 'image': {
          await this.processImageTemplate(itemConfig, params, baseImg);
          break;
        }
        case 'text': {
          await this.processTextTemplate(itemConfig, baseImg, params);
          break;
        }
        default:
          throw new Error(`Failed to apply a template. Unknown item type ${itemConfig.type}`);
      }
    }
  }

  /**
   * Processes a text item of the template by adding and merging a text layer onto the base image.
   * @private
   * @param   {Object}          itemConfig the part of the image template defined as a JSON
   * @param   {DepreciatedJimp} baseImg    the base image
   * @param   {Object}          params     the parameters to be applied for the base image
   * @returns {Promise}                    nothing
   */
  async processTextTemplate(itemConfig, baseImg, params) {
    let x = 0;
    let y = 0;
    if (itemConfig.margin) {
      x = baseImg.getWidth() / 100 * itemConfig.margin.left || 0;
      y = baseImg.getHeight() / 100 * itemConfig.margin.top || 0;
      const x2 = baseImg.getWidth() - baseImg.getWidth() / 100 * itemConfig.margin.right || 0;
      const y2 = baseImg.getHeight() - baseImg.getHeight() / 100 * itemConfig.margin.bottom || 0;
      itemConfig.style.customHeight = y2 - y;
      itemConfig.style.maxWidth = x2 - x;
    }
    // Override font size
    if (params.fontSize) {
      itemConfig.style.fontSize = params.fontSize;
      itemConfig.style.lineHeight = Math.round(params.fontSize * FONT_SIZE_TO_LINE_HEIGHT);
    }
    const picText = await TextToImage.generate(params.text, itemConfig.style || {});
    const picTextBuffer = Buffer.from(picText.split(',')[1], 'base64');
    const jimpText = await Jimp.read(picTextBuffer);

    if (itemConfig.rotate) {
      jimpText.rotate(itemConfig.rotate);
    }

    if (itemConfig.shear) {
      this.shear(jimpText, itemConfig.shear);
    }

    baseImg.composite(jimpText, x, y);
  }

  /**
   * Processes an image item of the template by adding and merging an image layer onto the base image.
   * @private
   * @param   {Object}          itemConfig the part of the image template defined as a JSON
   * @param   {Object}          params     the parameters to be applied for the base image
   * @param   {DepreciatedJimp} baseImg    the base image
   * @returns {Promise}                    nothing
   */
  async processImageTemplate(itemConfig, params, baseImg) {
    const tmpPic = await Jimp.read(itemConfig.url);
    // Recursive call for child items
    if (itemConfig.items !== undefined) {
      await this.composeImage(tmpPic, itemConfig.items, params);
    }

    const blendMode = itemConfig.blend || {};

    let composeX = 0;
    let composeY = 0;
    switch (itemConfig.align) {
      case 'top':
        if (itemConfig.autoscale) {
          tmpPic.scaleToFit(baseImg.getWidth(), Number.MAX_VALUE);
        }
        break;

      case 'left':
        if (itemConfig.autoscale) {
          tmpPic.scaleToFit(Number.MAX_VALUE, baseImg.getHeight());
        }
        break;

      case 'bottom':
        if (itemConfig.autoscale) {
          tmpPic.scaleToFit(baseImg.getWidth(), Number.MAX_VALUE);
        }
        composeX = 0;
        composeY = baseImg.getHeight() - tmpPic.getHeight();
        break;

      case 'right':
        if (itemConfig.autoscale) {
          tmpPic.scaleToFit(Number.MAX_VALUE, baseImg.getHeight());
        }
        composeX = baseImg.getWidth() - tmpPic.getWidth();
        composeY = 0;
        break;
      default:
        if (itemConfig.autoscale) {
          tmpPic.scaleToFit(baseImg.getWidth(), baseImg.getHeight());
        }
    }

    if (itemConfig.rotate) {
      tmpPic.rotate(itemConfig.rotate);
    }

    if (itemConfig.shear) {
      this.shear(tmpPic, itemConfig.shear);
    }


    baseImg.composite(tmpPic, composeX, composeY, blendMode);
  }

  /**
   * Shears an image layer.
   * @private
   * @param   {DepreciatedJimp} img    the image to be sheared
   * @param   {Number}          offset the tangent offset in pixels
   */
  shear(img, offset) {
    const source = img.cloneQuiet();
    img.scanQuiet(0, 0, img.bitmap.width, img.bitmap.height,
      (x, y, idx) => {
        img.bitmap.data.writeUInt32BE(img._background, idx);
      });

    // Resize to fit result
    img.resize(img.getWidth(), img.getHeight() + Math.abs(offset));

    img.scanQuiet(0, 0, img.bitmap.width, img.bitmap.height,
      (x, y, idx) => {
        let displacement = 0;
        if (offset > 0) {
          displacement = x / source.getWidth() * offset;
        } else {
          displacement = (x - source.getWidth()) / source.getWidth() * offset;
        }
        const pixelOffset = displacement - Math.round(displacement);
        displacement = Math.round(displacement);

        const sourceY = y - displacement;
        let pixelRGBA = img._background;
        if (sourceY >= 0) {
          pixelRGBA = source.bitmap.data.readUInt32BE(source.getPixelIndex(x, sourceY));
        }

        const sourceBlendY = pixelOffset < 0 ? sourceY + 1 : sourceY - 1;
        let pixelToBlend = img._background;
        if (sourceBlendY >= 0) {
          const pixelToBlendIds = source.getPixelIndex(x, sourceBlendY);
          pixelToBlend = source.bitmap.data.readUInt32BE(pixelToBlendIds);
        }
        const pixelBlended = this.blendPixels(pixelRGBA, pixelToBlend, Math.abs(pixelOffset));
        img.bitmap.data.writeUInt32BE(pixelBlended, idx);
      });

    return img;
  }

  /**
   * Blend 2 pixels using their weight.
   * @private
   * @param   {Uint32Array}   pix1   the color of the first pixel as a byte array
   * @param   {Uint32Array}   pix2   the color of the second pixel as a byte array
   * @param   {Number}        weight the weight of the 2nd pixel (0.0 to 1.0)
   * @returns {Uint32Array}          the blended pixel
   */
  blendPixels(pix1, pix2, weight) {
    if (pix1 === pix2 || weight === 0) {
      return pix1;
    }

    function toBytesInt32(num) {
      const arr = new Uint8Array([
        (num & 0xff000000) >> 24,
        (num & 0x00ff0000) >> 16,
        (num & 0x0000ff00) >> 8,
        (num & 0x000000ff)
      ]);
      return arr.buffer;
    }

    const pix1Bytes = new Uint8Array(toBytesInt32(pix1));
    const pix2Bytes = new Uint8Array(toBytesInt32(pix2));
    const resultArr = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      resultArr[i] = Math.round(Math.sqrt(Math.pow(pix1Bytes[i], 2) * (1 - weight) +
        Math.pow(pix2Bytes[i], 2) * weight));
    }
    return new Uint32Array(resultArr.buffer)[0];
  }
}

/**
 * Exports the ImageGenerator class
 * @type {ImageGenerator}
 */
module.exports = ImageGenerator;
