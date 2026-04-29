export default function getSafeUrl(url: string) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
        return url;
    }
    return ""; // you can also put a default placeholder image path here
}