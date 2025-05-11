import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { Page } from "puppeteer";

async function downloadPage() {
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const url = "https://www.sortlist.com/s/full-stack-development/morocco-ma";

    console.log(`Navigating to ${url}...`);
    // const url = "https://www.sortlist.com/fr/web-development/morocco-ma";
    if (page.url().includes("cloudflare")) {
        console.log("Cloudflare verification detected. Waiting 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 6000));
    }

    if (page.url() !== url) {
        console.log(
            "Waiting 5 seconds for potential Cloudflare verification..."
        );
        //
        await new Promise((resolve) => setTimeout(resolve, 5000)); // ✅ CORRECT

        const html = await page.content();
        await fs.writeFile("downloaded-page.html", html);

        console.log("✅ Page successfully saved as downloaded-page.html");

        await browser.close();
    }

    async function scrapeFromSavedHTML() {
        const html = await fs.readFile("downloaded-page.html", "utf-8");
        // const url= "https://www.sortlist.com/s/full-stack-development/morocco-ma";
        const $ = cheerio.load(html);

        const agencies: any[] = [];

        $("ul.grid-list li article").each((index, element) => {
            const name = $(element).find("div.agency-name a").text().trim();
            const href =
                "https://www.sortlist.com" +
                $(element).find("div.agency-name a").attr("href");
            const description = $(element)
                .find("div.agency-info p")
                .text()
                .trim();
            const location = $(element)
                .find(".agency-main-info .agency-info-cell")
                .eq(0)
                .text()
                .trim();
            const services = $(element)
                .find(".agency-main-info .agency-info-cell")
                .eq(1)
                .text()
                .trim();

            agencies.push({
                name,
                href,
                description,
                location,
                services,
            });
        });

        console.log(`✅ Found ${agencies.length} agencies.`);
        console.dir(agencies, { depth: null });
    }
}

interface Agency {
    name: string;
    href: string;
    description: string;
    location: string;
    services: string;
}

async function scrapeFromURL(
    specialty: string = "full-stack-development"
): Promise<Agency[]> {
    const url = `https://www.sortlist.com/s/${specialty}/morocco-ma`;
    puppeteer.use(StealthPlugin()); // important

    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled", // ✅ cacher l'automatisation
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-gpu",
            "--window-size=1920,1080",
        ],
        defaultViewport: {
            width: 1920,
            height: 1080,
        },
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" }); // attendre que tout charge

    await skipCloudflare(page); // attendre 6 secondes si Cloudflare challenge

    const content = await page.content(); // récupérer le HTML final

    await browser.close(); // fermer le navigateur

    const $ = cheerio.load(content); // charger le HTML dans cheerio

    const agencies: Agency[] = [];

    $("ul.grid-list li article").each((index, element) => {
        const name = $(element).find("div.agency-name a").text().trim();
        const href =
            "https://www.sortlist.com" +
            $(element).find("div.agency-name a").attr("href");
        const description = $(element).find("div.agency-info p").text().trim();
        const location = $(element)
            .find(".agency-main-info .agency-info-cell")
            .eq(0)
            .text()
            .trim();
        const services = $(element)
            .find(".agency-main-info .agency-info-cell")
            .eq(1)
            .text()
            .trim();

        agencies.push({
            name,
            href,
            description,
            location,
            services,
        });
    });

    console.log(`✅ Found ${agencies.length} agencies.`);
    // console.dir(agencies, { depth: null });

    return new Promise((resolve, _) => resolve(agencies));
}

export async function sortListAgencies(specialtys: string[]) {
    //  The current date and time
    const now = new Date();
    // Format the date and time as a string
    const folderName = `src/data/sort-list/${now.getFullYear()}-${(
        now.getMonth() + 1
    )
        .toString()
        .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now
        .getHours()
        .toString()
        .padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;

    // Array to store specialties with no data
    let emptySpecialty: string[] = [];

    try {
        // Create the folder to store the scraped data
        await fs.mkdir(folderName, { recursive: true });

        // Scrap all specialties
        for (const specialty of specialtys) {
            console.log(`Scraping specialty: ${specialty}`);
            const output = await scrapeFromURL(specialty);
            if (output.length > 0) {
                await fs.writeFile(
                    `${folderName}/agencies-${specialty}.json`,
                    JSON.stringify(output, null, 2)
                );
            } else {
                emptySpecialty.push(specialty);
                console.log(`❌ No data found for specialty: ${specialty}`);
            }
        }
    } catch (error) {
        console.error(`Error scraping specialties: ${error}`);
    }

    console.log("Scraping completed.");
    if (emptySpecialty.length > 0) {
        console.log(
            `The following specialties returned no data: ${emptySpecialty.join(
                ", "
            )}`
        );
    }
}

// scrapeFromSavedHTML();

// downloadPage().catch(console.error);

async function skipCloudflare(page: Page) {
    if (page.url().includes("cloudflare")) {
        console.log("Cloudflare verification detected. Waiting 4 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 4000));
    }
}
