import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";

const S2_ITEMS = ["privacy.s2.li1", "privacy.s2.li2", "privacy.s2.li3", "privacy.s2.li4", "privacy.s2.li5", "privacy.s2.li6"];
const S3_ITEMS = ["privacy.s3.li1", "privacy.s3.li2", "privacy.s3.li3", "privacy.s3.li4"];
const S4_ITEMS = ["privacy.s4.li1", "privacy.s4.li2", "privacy.s4.li3", "privacy.s4.li4"];
const S5_ITEMS = ["privacy.s5.li1", "privacy.s5.li2", "privacy.s5.li3", "privacy.s5.li4"];
const S8_ITEMS = ["privacy.s8.li1", "privacy.s8.li2", "privacy.s8.li3", "privacy.s8.li4", "privacy.s8.li5", "privacy.s8.li6"];

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <LegalDocument
      active="privacy"
      testid="privacy-page"
      title={t("privacy.title")}
      intro={t("privacy.intro")}
    >
      <LegalSection title={t("privacy.s1.title")}>
        <p>
          {t("privacy.s1.pPrefix")}{" "}
          <Link to="/tickets">{t("legal.supportLink")}</Link>{" "}
          {t("privacy.s1.pSuffix")}
        </p>
      </LegalSection>

      <LegalSection title={t("privacy.s2.title")}>
        <p>{t("privacy.s2.pIntro")}</p>
        <ul>
          {S2_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("privacy.s3.title")}>
        <ul>
          {S3_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("privacy.s4.title")}>
        <p>{t("privacy.s4.p1")}</p>
        <ul>
          {S4_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("privacy.s5.title")}>
        <ul>
          {S5_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("privacy.s6.title")}>
        <p>{t("privacy.s6.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.s7.title")}>
        <p>{t("privacy.s7.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.s8.title")}>
        <p>{t("privacy.s8.pIntro")}</p>
        <ul>
          {S8_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <p>
          {t("privacy.s8.p2Prefix")}
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer noopener">www.cnil.fr</a>
          {t("privacy.s8.p2Suffix")}
        </p>
      </LegalSection>

      <LegalSection title={t("privacy.s9.title")}>
        <p>{t("privacy.s9.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.s10.title")}>
        <p>{t("privacy.s10.p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.s11.title")}>
        <p>{t("privacy.s11.p1")}</p>
        <p>
          {t("privacy.s11.pPrefix")}{" "}
          <Link to="/conditions">{t("legal.termsLink")}</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
