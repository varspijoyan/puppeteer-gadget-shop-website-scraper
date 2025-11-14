import dotenv from "dotenv";
import fs from "fs";
import puppeteer from "puppeteer";

dotenv.config();

async function getProducts(page) {
  await page.waitForSelector(".products .product");
  return await page.evaluate(() => {
    const productsList = document.querySelectorAll(".products .product");
    const data = [];

    productsList.forEach((product) => {
      const productImageSelector = product.querySelector(
        ".woocommerce-loop-product__link img"
      );
      const productTitleSelector = product.querySelector(
        ".woocommerce-loop-product__link .woocommerce-loop-product__title"
      );
      const productCategorySelector = productTitleSelector.querySelector(
        ".codevz-product-category-after-title"
      );
      const productPriceSelector = product.querySelector(
        ".woocommerce-loop-product__link .price .amount bdi"
      );

      const image = productImageSelector?.src;
      const title = productTitleSelector?.innerText?.split("\n")[0];
      const category = productCategorySelector?.textContent;
      const price = productPriceSelector?.innerText?.split("$")[1];

      data.push({
        image,
        title,
        category,
        price: parseInt(price),
      });
    });
    return data;
  });
}

async function clickOnLink(page, selector) {
  await page.waitForSelector(selector, { visible: true });
  await page.evaluate(
    (sel) => document.querySelector(sel).scrollIntoView(),
    selector
  );
  await page.click(selector);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: false,
  });
  const page = await browser.newPage();

  try {
    await page.goto(process.env.WEBSITE, { waitUntil: "networkidle0" });

    await clickOnLink(page, "a[data-title='Shop']");

    const hasNextBtn = true;
    const allProducts = [];
    while (hasNextBtn) {
      const products = await getProducts(page);

      allProducts.push(...products);
      const nextBtn = await page.$("ul.page-numbers li a.next");

      if (!nextBtn) break;

      await page.evaluate((sel) => sel.scrollIntoView(), nextBtn);
      await Promise.all([
        nextBtn.click(),
        page.waitForSelector(".products .product", { visible: true }),
      ]);
    }

    fs.writeFileSync(
      "./json/gadget-shop-data.json",
      JSON.stringify(allProducts, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.log("Automation error:", error);
  } finally {
    await browser.close();
  }
}

await run();
