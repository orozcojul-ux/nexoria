/** Localize Nexus Wheel reward labels/descriptions from API (French source). */

function pick(t, key, fallback) {
  const v = t(key);
  return v !== key ? v : fallback;
}

export function translateWheelReward(t, reward) {
  if (!reward?.id) return reward;
  const id = reward.id;
  return {
    ...reward,
    label: pick(t, `nexusWheel.reward.${id}.label`, reward.label),
    description: pick(t, `nexusWheel.reward.${id}.description`, reward.description),
    flavor: reward.flavor
      ? pick(t, `nexusWheel.reward.${id}.flavor`, reward.flavor)
      : reward.flavor,
    resource_name: reward.resource_name
      ? pick(t, `nexusWheel.reward.${id}.resourceName`, reward.resource_name)
      : reward.resource_name,
  };
}

export function translateWheelRewards(t, rewards) {
  if (!Array.isArray(rewards)) return [];
  return rewards.map((r) => translateWheelReward(t, r));
}
