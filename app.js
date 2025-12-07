require("dotenv").config();

const express = require('express');
const morgan = require('morgan');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { readFileSync } = require('fs');
const { JSDOM } = require('jsdom');
const { createCanvas, loadImage, registerFont } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));
app.use(morgan('dev'));

async function fetchCount() {
  try {
    return (await axios.get("https://api.counterapi.dev/v1/aqul/brat/up")).data?.count || 0;
  } catch {
    return 0;
  }
}

async function renderHtmlToImage(text, background = '#000000', color = '#ffffff') {
  const htmlTemplate = readFileSync(path.join(__dirname, './site/index.html'), 'utf-8');
  const dom = new JSDOM(htmlTemplate);
  const document = dom.window.document;

  const nodeContent = document.querySelector('.node__content.clearfix');
  const textFitted = document.querySelector('.textFitted');
  const textInput = document.querySelector('#textInput');

  if (nodeContent) nodeContent.style.backgroundColor = background;
  if (textFitted) {
    textFitted.style.color = color;
    textFitted.textContent = text;
  }
  if (textInput) textInput.value = text;

  const canvasWidth = 500;
  const canvasHeight = 500;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = color;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = text.split(' ');
  let line = '';
  let y = canvasHeight / 2 - 100;
  const lineHeight = 60;
  const maxWidth = 450;

  for (let word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && line !== '') {
      ctx.fillText(line, canvasWidth / 2, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, canvasWidth / 2, y);

  return canvas.toBuffer('image/png');
}

app.get("/", async (req, res) => {
  try {
    const { text, background = '#000000', color = '#ffffff' } = req.query;
    const hit = await fetchCount();

    if (!text) {
      return res.status(200).json({
        author: "Riyoo",
        repository: { github: "https://github.com/zennn08/brat-api/" },
        hit,
        message: "Parameter `text` diperlukan",
        runtime: {
          os: os.type(),
          platform: os.platform(),
          architecture: os.arch(),
          cpuCount: os.cpus().length,
          uptime: `${os.uptime()} seconds`,
          memoryUsage: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)} MB used of ${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        }
      });
    }

    const imageBuffer = await renderHtmlToImage(text, background, color);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", imageBuffer.length);
    return res.status(200).send(imageBuffer);

  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running → http://localhost:${PORT}`);
  });
}

module.exports = app;