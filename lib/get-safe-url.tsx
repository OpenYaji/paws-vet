export default function getSafeUrl(url: string) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") || url.startsWith("blob")) {
        return url;
    }
    return ""; // you can also put a default placeholder image path here
}