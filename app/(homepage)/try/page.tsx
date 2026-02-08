
const response = await fetch('http://localhost:3000/api/try');
const books = await response.json();

export default function page() {
  return (
    <main>
        <h1 className="text-2xl font-bold mb-4">Books</h1>
        <ul className="list-disc pl-5 space-y-2">
            {books.map((book: { id: number; name: string; author: string }) => (
            <li key={book.id}>
                <span className="font-semibold">{book.name}</span> by {book.author}
                
            </li>
            ))}
        </ul>
    </main>  )
}

