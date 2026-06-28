import {
  enrichNotificationParams,
  extractLegacyNotificationParams,
  translateNotification,
} from "./translate-notification";

describe("translate-notification", () => {
  test("extracts amount from legacy VIP daily French message", () => {
    const legacy = extractLegacyNotificationParams({
      message: "+100 écus du Nexus offerts par ton Pass Ascendant.",
    });
    expect(legacy.amount).toBe(100);
  });

  test("extracts badge name and description from legacy text", () => {
    const legacy = extractLegacyNotificationParams({
      kind: "badge",
      title: "Badge débloqué : Marcheur des Failles",
      message: "Vous traversez la dimension",
    });
    expect(legacy.name).toBe("Marcheur des Failles");
    expect(legacy.description).toBe("Vous traversez la dimension");
  });

  test("extracts shop itemName from legacy message", () => {
    const legacy = extractLegacyNotificationParams({
      kind: "shop",
      message: "« Passe Ascendant » est à vous",
    });
    expect(legacy.itemName).toBe("Passe Ascendant");
  });

  test("enriches VIP daily params when amount missing", () => {
    const params = enrichNotificationParams(
      {
        kind: "vip",
        message: "+100 écus du Nexus offerts par ton Pass Ascendant.",
        params: { variant: "daily" },
      },
      { variant: "daily" },
    );
    expect(params.amount).toBe(100);
  });

  test("replaces {{amount}} after i18n translation", () => {
    const t = (key) => {
      if (key === "notif.vip.daily.title") return "VIP-Tageskiste";
      if (key === "notif.vip.daily.message") return "+{{amount}} Écus vom Nexus — Ascendant-Pass.";
      return key;
    };

    const { title, message } = translateNotification(
      {
        kind: "vip",
        title: "Coffre quotidien VIP",
        message: "+100 écus du Nexus offerts par ton Pass Ascendant.",
        params: { variant: "daily" },
      },
      t,
    );

    expect(title).toBe("VIP-Tageskiste");
    expect(message).toBe("+100 Écus vom Nexus — Ascendant-Pass.");
    expect(message).not.toMatch(/\{\{/);
  });

  test("replaces badge placeholders from legacy stored text", () => {
    const t = (key) => {
      if (key === "notif.badge.title") return "Badge débloqué : {{name}}";
      if (key === "notif.badge.message") return "{{description}}";
      return key;
    };

    const { title, message } = translateNotification(
      {
        kind: "badge",
        title: "Badge débloqué : Marcheur des Failles",
        message: "Vous traversez la dimension",
        params: {},
      },
      t,
    );

    expect(title).toBe("Badge débloqué : Marcheur des Failles");
    expect(message).toBe("Vous traversez la dimension");
    expect(title).not.toMatch(/\{\{/);
    expect(message).not.toMatch(/\{\{/);
  });

  test("replaces shop itemName from legacy stored text", () => {
    const t = (key) => {
      if (key === "notif.shop.title") return "Achat confirmé";
      if (key === "notif.shop.message") return "« {{itemName}} » est à vous";
      return key;
    };

    const { title, message } = translateNotification(
      {
        kind: "shop",
        title: "Achat confirmé",
        message: "« Passe Ascendant » est à vous",
        params: {},
      },
      t,
    );

    expect(title).toBe("Achat confirmé");
    expect(message).toBe("« Passe Ascendant » est à vous");
    expect(message).not.toMatch(/\{\{/);
  });

  test("uses params when present for new notifications", () => {
    const t = (key) => {
      if (key === "notif.badge.title") return "Badge débloqué : {{name}}";
      if (key === "notif.badge.message") return "{{description}}";
      return key;
    };

    const { title, message } = translateNotification(
      {
        kind: "badge",
        title: "Badge débloqué : Old Name",
        message: "Old description",
        params: { name: "Pionnier", description: "Premier sur le Nexus" },
      },
      t,
    );

    expect(title).toBe("Badge débloqué : Pionnier");
    expect(message).toBe("Premier sur le Nexus");
  });
});
