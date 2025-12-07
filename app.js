require("dotenv").config();

const chromium = require("@sparticuz/chromium");
const playwright = require("playwright-core");
const path = require("path");
const os = require("os");
const axios = require("axios");

let browser;

async function getBrowser() {
  if (browser) return browser;

  browser = await playwright.chromium.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true
  });

  return browser;
}

async function fetchCount() {
  try {
    const res = await axios.get("https://api.counterapi.dev/v1/aqul/brat/up");
    return res.data?.count || 0;
  } catch {
    return 0;
  }
}

module.exports = async (req, res) => {
  const { text, background, color } = req.query;
  const hit = await fetchCount();

  if (!text) {
    return res.status(200).json({
      author: "zennn08 (aqul)",
      repository: { github: "https://github.com/zennn08/brat-api/" },
      hit,
      message: "Parameter `text` diperlukan",
      runtime: {
        os: os.type(),
        platform: os.platform(),
        architecture: os.arch(),
        cpuCount: os.cpus().length,
        uptime: `${os.uptime()} seconds`,
        memoryUsage: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)} MB used of ${Math.round(os.totalmem() / 1024 / 1024)} MB`
      }
    });
  }

  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1536, height: 695 } });
  const page = await context.newPage();

  const filePath = path.join(process.cwd(), "site/index.html");
  await page.goto(`file://${filePath}`);

  await page.click("#toggleButtonWhite");
  await page.click("#textOverlay");
  await page.click("#textInput");
  await page.fill("#textInput", text);

  await page.evaluate(({ background, color }) => {
    if (background) document.querySelector(".node__content.clearfix").style.backgroundColor = background;
    if (color) document.querySelector(".textFitted").style.color = color;
  }, { background, color });

  const element = await page.$("#textOverlay");
  const box = await element.boundingBox();

  const screenshot = await page.screenshot({
    type: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: 500,
      height: 500
    }
  });

  await context.close();

  res.setHeader("Content-Type", "image/png");
  return res.status(200).send(screenshot);
};



if (!process.env.VERCEL) {
  const express = require("express");
  const morgan = require("morgan");

  const app = express();
  const port = process.env.PORT || 3000;

  app.use(morgan("dev"));
  app.get("*", module.exports);

  app.listen(port, () => console.log(`🟢 Local Dev Mode → http://localhost:${port}`));
}