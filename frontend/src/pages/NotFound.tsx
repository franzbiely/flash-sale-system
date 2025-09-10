import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div>
      <h1 className="text-2xl font-bold">404 - Not Found</h1>
      <p className="mt-2 text-gray-600">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Go Home</Link>
    </div>
  );
}
