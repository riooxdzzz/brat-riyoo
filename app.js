require("dotenv").config();

const express = require('express');
const morgan = require('morgan');
const chromium = require('@sparticuz/chromium');
const playwright = require('playwright-core');
const path = require('path');
const os = require('os');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

let browser;

const launchBrowser = async () => {
  if (browser) return browser;

  browser = await playwright.chromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });

  return browser;
};

async function fetchCount() {
  try {
    return (await axios.get("https://api.counterapi.dev/v1/aqul/brat/up")).data?.count || 0
  } catch {
    return 0
  }
}

app.get("/", async (req, res) => {
  try {
    const { text, background, color } = req.query;
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

    await launchBrowser();

    const context = await browser.newContext({
      viewport: { width: 1536, height: 695 }
    });

    const page = await context.newPage();

    const filePath = path.join(__dirname, './site/index.html');

    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });

    await page.click('#toggleButtonWhite');
    await page.click('#textOverlay');
    await page.click('#textInput');
    await page.fill('#textInput', text);

    await page.evaluate((data) => {
      if (data.background) {
        document.querySelector('.node__content.clearfix').style.backgroundColor = data.background;
      }
      if (data.color) {
        document.querySelector('.textFitted').style.color = data.color;
      }
    }, { background, color });

    const element = await page.$('#textOverlay');
    const box = await element.boundingBox();

    const screenshot = await page.screenshot({
      type: "png",
      clip: {
        x: box.x,
        y: box.y,
        width: 500,
        height: 500,
      }
    });

    await context.close();

    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(screenshot);

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