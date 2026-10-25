import { chromium } from "@playwright/test";
import serverChromium from "@sparticuz/chromium";
const browser = await chromium.launch({
  executablePath: await serverChromium.executablePath(),
  args: serverChromium.args,
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1536, height: 1100 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
await page.goto("http://localhost:3000/login");
await page.getByRole("button", { name: "Acessar demonstração" }).click();
await page.waitForURL("http://localhost:3000/");
await page.getByRole("heading", { name: "Evolução do negócio" }).waitFor();
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/pulse-desktop.png", fullPage: true });
console.log(
  "desktop overflow",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/pulse-mobile.png", fullPage: true });
console.log(
  "mobile overflow",
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
await browser.close();
