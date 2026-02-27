export async function Fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.error || "Failed to fetch data");
  }

  return res.json();
};