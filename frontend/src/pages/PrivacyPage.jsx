import React from "react";
import { Link } from "react-router-dom";
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument";

export default function PrivacyPage() {
  return (
    <LegalDocument
      active="privacy"
      testid="privacy-page"
      title="Politique de confidentialité"
      intro="NEXORIA s'engage à protéger vos données personnelles. Ce document explique quelles informations nous collectons, pourquoi, combien de temps nous les conservons et quels sont vos droits conformément au Règlement général sur la protection des données (RGPD)."
    >
      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement est l'équipe NEXORIA. Pour exercer vos droits ou poser une
          question relative à la vie privée, utilisez la page{" "}
          <Link to="/tickets">Support / Tickets</Link> en précisant « Données personnelles ».
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <p>Selon votre utilisation du Service, nous pouvons traiter :</p>
        <ul>
          <li><strong>Compte :</strong> adresse e-mail, pseudonyme, mot de passe (stocké de manière sécurisée), classe de personnage, préférences de langue et d'affichage.</li>
          <li><strong>Profil public :</strong> avatar, bannière, biographie, titres, badges, statistiques de jeu, visibilité choisie dans les paramètres.</li>
          <li><strong>Activité :</strong> publications, messages (forum, amis, guilde, Nexus Online), réactions, quêtes accomplies, achats virtuels, logs de connexion.</li>
          <li><strong>OAuth :</strong> si vous liez Discord ou Google — identifiant externe, nom affiché et avatar fournis par le fournisseur (selon vos autorisations).</li>
          <li><strong>Technique :</strong> adresse IP, type de navigateur, cookies ou stockage local nécessaires à la session et aux préférences.</li>
          <li><strong>Modération :</strong> signalements, sanctions appliquées, échanges avec le support.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalités et bases légales">
        <ul>
          <li><strong>Exécution du contrat</strong> — créer et gérer votre compte, fournir le gameplay et les fonctionnalités sociales.</li>
          <li><strong>Intérêt légitime</strong> — sécurité, prévention de la fraude, modération, amélioration du Service, statistiques agrégées.</li>
          <li><strong>Obligation légale</strong> — conservation de certaines traces si la loi l'exige.</li>
          <li><strong>Consentement</strong> — lorsque requis (ex. cookies non essentiels, newsletters si proposées).</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Partage des données">
        <p>Nous ne vendons pas vos données. Elles peuvent être partagées uniquement avec :</p>
        <ul>
          <li><strong>Prestataires techniques</strong> (hébergement, envoi d'e-mails) soumis à des obligations de confidentialité.</li>
          <li><strong>Discord / Google</strong> — uniquement si vous choisissez la connexion OAuth.</li>
          <li><strong>Autorités</strong> — sur requête légale valide.</li>
          <li><strong>Autres joueurs</strong> — contenu que vous rendez public (profil, posts, messages dans espaces ouverts).</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <ul>
          <li>Données de compte : tant que le compte est actif, puis suppression ou anonymisation sous 24 mois après clôture, sauf obligation légale contraire.</li>
          <li>Logs techniques : durée limitée (généralement 6 à 12 mois).</li>
          <li>Messages et contenus publics : conservés tant qu'ils restent publiés ou jusqu'à suppression par vous ou modération.</li>
          <li>Données de facturation : selon les obligations comptables applicables.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Cookies et stockage local">
        <p>
          NEXORIA utilise un jeton de session (localStorage) pour maintenir votre connexion et
          mémoriser certaines préférences (langue, interface). Ces éléments sont essentiels au
          fonctionnement du Service. D'autres traceurs analytiques, s'ils sont ajoutés ultérieurement,
          feront l'objet d'un consentement lorsque la réglementation l'exige.
        </p>
      </LegalSection>

      <LegalSection title="7. Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables (chiffrement
          des mots de passe, accès restreint, surveillance des abus). Aucun système n'étant infaillible,
          signalez toute suspicion de compromission via le support.
        </p>
      </LegalSection>

      <LegalSection title="8. Vos droits (RGPD)">
        <p>Sous réserve des limitations légales, vous disposez des droits suivants :</p>
        <ul>
          <li>Accès et copie de vos données.</li>
          <li>Rectification des informations inexactes.</li>
          <li>Effacement (« droit à l'oubli ») dans les cas prévus par la loi.</li>
          <li>Limitation ou opposition à certains traitements.</li>
          <li>Portabilité des données que vous avez fournies.</li>
          <li>Retrait du consentement lorsque le traitement en dépend.</li>
        </ul>
        <p>
          Vous pouvez également introduire une réclamation auprès de la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer noopener">www.cnil.fr</a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="9. Mineurs">
        <p>
          NEXORIA n'est pas destiné aux enfants de moins de 13 ans. Si vous pensez qu'un mineur a
          créé un compte sans autorisation parentale, contactez-nous pour demander sa suppression.
        </p>
      </LegalSection>

      <LegalSection title="10. Transferts hors UE">
        <p>
          Si des sous-traitants situés hors de l'Espace économique européen sont utilisés, nous
          veillons à ce que des garanties appropriées soient en place (clauses contractuelles types
          ou décision d'adéquation).
        </p>
      </LegalSection>

      <LegalSection title="11. Modifications">
        <p>
          Cette politique peut être mise à jour. La date en tête de page indique la dernière révision.
          Les changements importants pourront être annoncés sur le site ou par e-mail.
        </p>
        <p>
          Voir aussi nos <Link to="/conditions">Conditions générales d'utilisation</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
