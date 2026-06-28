import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";

const S2_ITEMS = ["terms.s2.li1", "terms.s2.li2", "terms.s2.li3", "terms.s2.li4"];
const S3_ITEMS = ["terms.s3.li1", "terms.s3.li2", "terms.s3.li3", "terms.s3.li4", "terms.s3.li5"];
const S5_ITEMS = ["terms.s5.li1", "terms.s5.li2", "terms.s5.li3"];

export default function TermsPage() {
  const { t } = useI18n();

  return (
    <LegalDocument
      active="terms"
      testid="terms-page"
      title={t("terms.title")}
      intro={t("terms.intro")}
    >
      <LegalSection title={t("terms.s1.title")}>
        <p>{t("terms.s1.p1")}</p>
        <p>
          {t("terms.s1.p2Prefix")}{" "}
          <Link to="/tickets">{t("legal.supportLink")}</Link>.
        </p>
      </LegalSection>

      <LegalSection title={t("terms.s2.title")}>
        <ul>
          {S2_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("terms.s3.title")}>
        <p>{t("terms.s3.pIntro")}</p>
        <ul>
          {S3_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <p>{t("terms.s3.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.s4.title")}>
        <p>{t("terms.s4.p1")}</p>
        <p>{t("terms.s4.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.s5.title")}>
        <p>{t("terms.s5.pIntro")}</p>
        <ul>
          {S5_ITEMS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("terms.s6.title")}>
        <p>{t("terms.s6.p1")}</p>
      </LegalSection>

      <LegalSection title={t("terms.s7.title")}>
        <p>{t("terms.s7.p1")}</p>
        <p>{t("terms.s7.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.s8.title")}>
        <p>{t("terms.s8.p1")}</p>
        <p>{t("terms.s8.p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.s9.title")}>
        <p>
          {t("terms.s9.pPrefix")}{" "}
          <Link to="/confidentialite">{t("legal.privacyPolicyLink")}</Link>.
        </p>
      </LegalSection>

      <LegalSection title={t("terms.s10.title")}>
        <p>{t("terms.s10.p1")}</p>
        <p>{t("terms.s10.p2")}</p>
      </LegalSection>
    </LegalDocument>
  );
}
