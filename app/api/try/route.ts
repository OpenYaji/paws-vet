import books from "../db";

export async function GET() {
    return Response.json(books);
}

