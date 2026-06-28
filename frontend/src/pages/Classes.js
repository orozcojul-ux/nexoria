/**
 * NEXORIA — Classes (sanctuaire des héros).
 * Design Pippit (ClassesPage) branché sur les données réelles /game/classes.
 */
import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ClassesPage from "@/pages/ClassesPage";
import ClassGrimoireModal from "@/components/ClassGrimoireModal";

/* ids FR de ClassesPage → ids back-end EN de /game/classes */
const FR_TO_EN = {
  guerrier: "warrior",
  explorateur: "explorer",
  necromancien: "necromancer",
  architecte: "architect",
  chronomancien: "chronomancer",
  inventeur: "inventor",
  alchimiste: "alchemist",
};

export default function Classes() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [activeClass, setActiveClass] = useState(null);

  useEffect(() => {
    api.get("/game/classes").then((r) => setClasses(r.data || []));
  }, []);

  const openGrimoire = (cls) => {
    const apiId = FR_TO_EN[cls.id] || cls.id;
    const found = classes.find(
      (c) => c.id === apiId || (cls.name && c.name?.toLowerCase() === cls.name.toLowerCase())
    );
    setActiveClass(found || { id: cls.id, name: cls.name, color: cls.color, stat_bonus: {} });
  };

  return (
    <>
      <ClassesPage
        heroClass={user?.class_id || user?.class_name || ""}
        onGrimoire={openGrimoire}
      />
      <ClassGrimoireModal cls={activeClass} onClose={() => setActiveClass(null)} />
    </>
  );
}
