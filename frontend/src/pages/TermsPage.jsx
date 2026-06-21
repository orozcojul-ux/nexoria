import React from "react";
import { Link } from "react-router-dom";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";

export default function TermsPage() {
  return (
    <LegalDocument
      active="terms"
      testid="terms-page"
      title="Conditions générales d'utilisation"
      intro="Les présentes conditions régissent l'accès et l'utilisation de NEXORIA, plateforme de jeu de rôle social en ligne. En créant un compte ou en utilisant le service, vous acceptez l'intégralité de ce document."
    >
      <LegalSection title="1. Éditeur et service">
        <p>
          NEXORIA (« le Service ») est un univers MMORPG social accessible via le site web et ses
          fonctionnalités associées (forum, profils, quêtes, boutique virtuelle, Nexus Online, etc.).
        </p>
        <p>
          Pour toute question relative à ces conditions, contactez-nous via la page{" "}
          <Link to="/tickets">Support / Tickets</Link>.
        </p>
      </LegalSection>

      <LegalSection title="2. Éligibilité et compte">
        <ul>
          <li>Vous devez avoir l'âge minimum requis pour utiliser un service en ligne dans votre pays (13 ans minimum ; 16 ans recommandé en France pour un compte autonome).</li>
          <li>Un compte est personnel, non transférable et lié à une adresse e-mail ou à un compte OAuth (Discord, Google) autorisé.</li>
          <li>Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte.</li>
          <li>Les informations fournies à l'inscription doivent être exactes et ne doivent pas usurper l'identité d'un tiers.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Règles de conduite">
        <p>En rejoignant le royaume, vous vous engagez à respecter la communauté et le staff (Sages, Sentinelles, Gardien Suprême). Sont notamment interdits :</p>
        <ul>
          <li>Le harcèlement, les propos haineux, discriminatoires, violents ou sexuellement explicites.</li>
          <li>Le spam, la publicité non autorisée, le phishing et toute tentative de fraude.</li>
          <li>La triche, l'exploitation de bugs, l'usage de bots ou de scripts non approuvés.</li>
          <li>Le contournement d'une sanction (mute, ban, exclusion du Nexus).</li>
          <li>La publication de contenu illégal ou portant atteinte aux droits de tiers (droits d'auteur, vie privée).</li>
        </ul>
        <p>
          Le contenu que vous publiez (posts, messages, profil, forum) peut être modéré, masqué ou
          supprimé. Les signalements sont examinés par l'équipe de modération.
        </p>
      </LegalSection>

      <LegalSection title="4. Contenus utilisateur">
        <p>
          Vous conservez vos droits sur les contenus que vous créez. En les publiant sur NEXORIA,
          vous nous accordez une licence non exclusive, mondiale et gratuite pour héberger, afficher,
          reproduire et adapter ces contenus uniquement dans le cadre du fonctionnement du Service
          (affichage sur le site, partage entre joueurs, modération).
        </p>
        <p>
          Vous garantissez disposer des droits nécessaires sur les contenus publiés (textes, images,
          pseudos, bannières).
        </p>
      </LegalSection>

      <LegalSection title="5. Monnaies virtuelles et achats">
        <p>
          NEXORIA peut proposer des monnaies virtuelles (Écus, Éther, etc.), des objets cosmétiques,
          des passes VIP ou saisonniers. Sauf mention contraire légale :
        </p>
        <ul>
          <li>Les biens virtuels n'ont pas de valeur monétaire en dehors du Service et ne sont pas remboursables une fois consommés.</li>
          <li>Les prix, disponibilités et avantages peuvent évoluer ; les soldes et inventaires peuvent être ajustés en cas d'erreur manifeste ou de fraude.</li>
          <li>En cas de fermeture du Service, aucun remboursement n'est garanti au-delà des obligations légales applicables.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Propriété intellectuelle">
        <p>
          NEXORIA, son univers, sa charte graphique, ses logos, textes, mécaniques de jeu et assets
          (hors contenus utilisateur) sont protégés. Toute reproduction ou exploitation commerciale
          sans autorisation écrite est interdite.
        </p>
      </LegalSection>

      <LegalSection title="7. Sanctions et résiliation">
        <p>
          En cas de violation des présentes conditions, nous pouvons appliquer des mesures graduées :
          avertissement, mute du tchat ou du forum, gel du compte, exclusion temporaire ou définitive
          du Service et du Nexus Online.
        </p>
        <p>
          Vous pouvez supprimer votre compte à tout moment depuis les paramètres ou en contactant le
          support. Nous pouvons suspendre ou fermer le Service, en tout ou partie, avec un préavis
          raisonnable lorsque cela est possible.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilité et responsabilité">
        <p>
          Le Service est fourni « en l'état ». Nous nous efforçons d'assurer une disponibilité
          continue, mais des interruptions (maintenance, incidents, phases bêta) peuvent survenir
          sans indemnisation.
        </p>
        <p>
          Dans les limites autorisées par la loi, NEXORIA ne pourra être tenu responsable des
          dommages indirects, pertes de données ou de progression liés à l'utilisation du Service.
        </p>
      </LegalSection>

      <LegalSection title="9. Données personnelles">
        <p>
          Le traitement de vos données personnelles est décrit dans notre{" "}
          <Link to="/confidentialite">Politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection title="10. Modifications et droit applicable">
        <p>
          Nous pouvons modifier ces conditions. En cas de changement substantiel, une information
          pourra être affichée sur le site. La poursuite de l'utilisation vaut acceptation des
          nouvelles conditions.
        </p>
        <p>
          Sauf disposition impérative contraire, le droit français s'applique. En cas de litige,
          une solution amiable sera recherchée avant toute action judiciaire ; les tribunaux
          compétents seront ceux du ressort de l'éditeur, sous réserve des règles protectrices
          du consommateur.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
