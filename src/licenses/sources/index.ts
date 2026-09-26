import type { LicenseSource } from "../../types/index.js";

export const spdx = (id: string): LicenseSource => ({
  title: `SPDX License List: ${id}`,
  url: `https://spdx.org/licenses/${id}.html`,
  kind: "SPDX",
});

export const osi = (slug: string, name: string): LicenseSource => ({
  title: `Open Source Initiative: ${name}`,
  url: `https://opensource.org/license/${slug}`,
  kind: "OSI",
});

export const official = (title: string, url: string): LicenseSource => ({ title, url, kind: "OFFICIAL_TEXT" });

export const vendor = (title: string, url: string): LicenseSource => ({ title, url, kind: "VENDOR" });

/** Shared references used by compatibility rules and pair exceptions. */
export const SOURCES = {
  fsfLicenseList: {
    title: "GNU Project: Various Licenses and Comments about Them",
    url: "https://www.gnu.org/licenses/license-list.html",
    kind: "FSF",
  },
  gplFaq: {
    title: "GNU Project: Frequently Asked Questions about the GNU Licenses",
    url: "https://www.gnu.org/licenses/gpl-faq.html",
    kind: "FAQ",
  },
  gplCompatibilityMatrix: {
    title: "GNU Project: GPL FAQ – license compatibility matrix",
    url: "https://www.gnu.org/licenses/gpl-faq.html#AllCompatibility",
    kind: "FAQ",
  },
  gplFaqSaas: {
    title: "GNU Project: GPL FAQ – modified versions used on a server",
    url: "https://www.gnu.org/licenses/gpl-faq.html#UnreleasedMods",
    kind: "FAQ",
  },
  gplFaqPrivateUse: {
    title: "GNU Project: GPL FAQ – modifying GPL software privately",
    url: "https://www.gnu.org/licenses/gpl-faq.html#GPLRequireSourcePostedPublic",
    kind: "FAQ",
  },
  gplFaqV2V3: {
    title: "GNU Project: GPL FAQ – is GPLv3 compatible with GPLv2?",
    url: "https://www.gnu.org/licenses/gpl-faq.html#v2v3Compatibility",
    kind: "FAQ",
  },
  apacheGplCompatibility: {
    title: "Apache Software Foundation: Apache License v2.0 and GPL Compatibility",
    url: "https://www.apache.org/licenses/GPL-compatibility.html",
    kind: "VENDOR",
  },
  mplFaq: {
    title: "Mozilla: MPL 2.0 FAQ",
    url: "https://www.mozilla.org/en-US/MPL/2.0/FAQ/",
    kind: "FAQ",
  },
  eplFaq: {
    title: "Eclipse Foundation: Eclipse Public License 2.0 FAQ",
    url: "https://www.eclipse.org/legal/epl-2.0/faq/",
    kind: "FAQ",
  },
  lgplFaqLinking: {
    title: "GNU Project: GPL FAQ – LGPL and proprietary programs",
    url: "https://www.gnu.org/licenses/gpl-faq.html#LGPLStaticVsDynamic",
    kind: "FAQ",
  },
  spdxLicenseList: {
    title: "SPDX License List",
    url: "https://spdx.org/licenses/",
    kind: "SPDX",
  },
  spdxExpressions: {
    title: "SPDX Specification: License Expressions",
    url: "https://spdx.github.io/spdx-spec/v2.3/SPDX-license-expressions/",
    kind: "SPDX",
  },
} as const satisfies Record<string, LicenseSource>;
