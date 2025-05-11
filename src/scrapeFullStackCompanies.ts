import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { Page } from "puppeteer";
import { Agency, AgencyDetails } from "@/common/interfaces/agency.interface";
// import { Agency, AgencyDetails } from "@/common/interfaces/agency.interface";

/**
 * [+] Scrape list of agencies from the specialty page
 */
async function scrapeFromURL(
    page: Page,
    specialty: string = "full-stack-development"
): Promise<Agency[]> {
    const url = `https://www.sortlist.com/s/${specialty}/morocco-ma`;

    console.log(`[+] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await skipCloudflare(page);

    const content = await page.content();
    const $ = cheerio.load(content);

    const agencies: Agency[] = [];

    $("ul.grid-list li article").each((_, element) => {
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

        agencies.push({ name, href, description, location, services });
    });

    console.log(`[+] Found ${agencies.length} agencies`);
    return agencies;
}

/**
 * [+] Scrape agencies for all specialties
 */
export async function sortListAgencies(specialties: string[]) {
    puppeteer.use(StealthPlugin());

    const now = new Date();
    const folderName = `src/data/sort-list/${now.getFullYear()}-${(
        now.getMonth() + 1
    )
        .toString()
        .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now
        .getHours()
        .toString()
        .padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;

    const emptySpecialty: string[] = [];

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
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

    try {
        await fs.mkdir(folderName, { recursive: true });
        const page = await browser.newPage();

        for (const specialty of specialties) {
            console.log(`[+] Scraping specialty: ${specialty}`);
            const agencies = await scrapeFromURL(page, specialty);

            if (agencies.length > 0) {
                // Visit each agency href separately
                for (const agency of agencies) {
                    const agencyPage = await browser.newPage();
                    console.log(`[+] Visiting agency: ${agency.name}`);

                    await agencyPage.goto(agency.href, {
                        waitUntil: "domcontentloaded",
                        timeout: 60000,
                    });

                    await skipCloudflare(agencyPage);

                    const agencyDetails = await scrapeAgencyDetails(agencyPage);
                    agency.agencyDetailes = agencyDetails;
                    console.log(`[+] AGENCY Details extracted:`);

                    await agencyPage.close();
                }

                await fs.writeFile(
                    `${folderName}/agencies-${specialty}.json`,
                    JSON.stringify(agencies, null, 2)
                );
            } else {
                emptySpecialty.push(specialty);
                console.log(`[!] No data found for specialty: ${specialty}`);
            }
        }
    } catch (error) {
        console.error(`[!] Error scraping specialties:`, error);
    } finally {
        await browser.close();
    }

    console.log("[+] Scraping completed");

    if (emptySpecialty.length > 0) {
        console.log(
            `[!] The following specialties returned no data: ${emptySpecialty.join(
                ", "
            )}`
        );
    }
}

/**
 * [+] Skip Cloudflare detection if present
 */
async function skipCloudflare(page: Page) {
    const cloudflareChallenge = await page.$("title");

    if (cloudflareChallenge) {
        const title = await page.title();
        if (
            title.toLowerCase().includes("just a moment") ||
            title.toLowerCase().includes("checking your browser")
        ) {
            console.log(
                "[!] Cloudflare challenge detected, waiting 7 seconds..."
            );
            // await page.waitForTimeout(7000);
            await new Promise((resolve) => setTimeout(resolve, 7000));
        }
    }
}

/**
 * [+] Scrape the detailed information about an agency
 */
async function scrapeAgencyDetails(page: Page): Promise<AgencyDetails> {
  return await page.evaluate(() => {
      const safeText = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() || "" : "";
      };

      // [>] Expand description text
      const span = document.querySelector('span[data-testid="clamp-lines"]');
      if (span) {
          span.className = "display-block"; // force class
      }
      const descriptionText = span?.textContent?.trim() || "";

      // [>] Headquarters block
      const headquartersBlock = Array.from(
          document.querySelectorAll('div.small.layout-column.py-8.px-12.rounded-sm')
      ).find(div => div.querySelector('span.bold')?.textContent?.includes('Headquarter'));

      const fullHeadquarters = headquartersBlock
          ? headquartersBlock.querySelector('span.text-break-word')?.textContent?.trim() || ""
          : "";

      let headquartersCity: string | undefined = undefined;
      if (fullHeadquarters) {
          const parts = fullHeadquarters.split(",");
          if (parts.length >= 2) {
              headquartersCity = parts[parts.length - 2].trim();
          }
      }

      // [>] Mobile, landline, website
      const mobileMatch = descriptionText.match(/Mobile\s*:\s*(\+\d[\d\s]+)/);
      const landlineMatch = descriptionText.match(/Fixe\s*:\s*(\+\d[\d\s]+)/);
      const websiteMatch = descriptionText.match(/Site\s*:\s*(https?:\/\/[^\s]+)/);

      // [>] Social media links
      const socialLinks = Array.from(document.querySelectorAll("a"))
          .map((a) => a.getAttribute("href") || "")
          .filter(link =>
              link.includes("linkedin.com") ||
              link.includes("facebook.com") ||
              link.includes("twitter.com") ||
              link.includes("instagram.com")
          );

      const linkedinProfile = socialLinks.find(link => link.includes("linkedin.com"));
      const otherSocialLinks: { [platform: string]: string } = {};
      for (const link of socialLinks) {
          if (link.includes("facebook.com")) otherSocialLinks.facebook = link;
          if (link.includes("twitter.com")) otherSocialLinks.twitter = link;
          if (link.includes("instagram.com")) otherSocialLinks.instagram = link;
      }

      // [>] Info fields
      const infoItems = document.querySelectorAll("div.layout-row.layout-wrap.p-8 > div, div.layout-row.layout-wrap.p-8 > a");
      const result: { [key: string]: string } = {};

      infoItems.forEach((item: any) => {
          const text = item.innerText.trim();

          if (text.includes("people in their team")) {
              result.employees = text;
          } else if (text.includes("Speaks")) {
              result.languages = text.replace("Speaks", "").trim();
          } else if (text.includes("projects in their portfolio")) {
              result.projects = text;
          } else if (text.includes("Works remotely")) {
              result.remoteWork = text;
          } else if (text.includes("member since")) {
              result.memberSince = text;
          } else if (text.includes("Founded in")) {
              result.founded = text;
          } else if (text.includes("awards conferred")) {
              result.awards = text;
          }
      });

      return {
          name: safeText("h1"),
          location: safeText("h1 + div"),
          description: descriptionText,
          mobilePhone: mobileMatch ? mobileMatch[1] : undefined,
          landlinePhone: landlineMatch ? landlineMatch[1] : undefined,
          website: websiteMatch ? websiteMatch[1] : undefined,
          employees: result.employees,
          projects: result.projects,
          remoteWork: result.remoteWork,
          founded: result.founded,
          memberSince: result.memberSince,
          collaborations: undefined, // not available now
          awards: result.awards,
          languages: result.languages,
          headquarters: fullHeadquarters,
          headquartersCity,
          linkedinProfile,
          otherSocialLinks,
          contactPage:
              Array.from(document.querySelectorAll("a"))
                  .find((a) =>
                      a.textContent?.toLowerCase().includes("contact")
                  )
                  ?.getAttribute("href") || undefined,
      };
  });
}



export async function test() {
    // Call the function to sort the list of agencies
    // await sortListAgencies(specialtys);

    puppeteer.use(StealthPlugin());

    const now = new Date();
    const folderName = `src/data/sort-list/${now.getFullYear()}-${(
        now.getMonth() + 1
    )
        .toString()
        .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now
        .getHours()
        .toString()
        .padStart(2, "0")}-${now.getMinutes().toString().padStart(2, "0")}`;

    const emptySpecialty: string[] = [];

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
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

    try {
        const page = await browser.newPage();
        await page.goto("https://www.sortlist.com/agency/digitransform", {
            waitUntil: "networkidle2",
            timeout: 60000,
        });
        console.log(await scrapeAgencyDetails(page));
    } catch (error) {
        console.error("Error during scraping:", error);
    }
}
