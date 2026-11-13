import { api } from "@/lib/api";

export type Setting = {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
};

export const getSettings = async () => {
  try {
    const response = await api.get("/settings");
    return response.data as Setting[];
  } catch (error) {
    throw error;
  }
};

export const createSetting = async (key: string, value: string) => {
  try {
    const response = await api.post("/settings", { key, value });
    return response.data as Setting;
  } catch (error) {
    throw error;
  }
};

export const updateSetting = async (id: string, value: string) => {
  try {
    const response = await api.patch(`/settings/${id}`, { value });
    return response.data as Setting;
  } catch (error) {
    throw error;
  }
};

/** Creates the setting if the key doesn't exist yet, otherwise updates its value. */
export const upsertSetting = async (existing: Setting[], key: string, value: string) => {
  const found = existing.find((setting) => setting.key === key);
  if (found) {
    return updateSetting(found.id, value);
  }
  return createSetting(key, value);
};
