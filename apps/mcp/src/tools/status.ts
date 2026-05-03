import { AxiosInstance } from "axios";

export async function runStatus(api: AxiosInstance): Promise<unknown> {
  const res = await api.get("/api/account/status");
  return res.data;
}
