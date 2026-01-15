import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 justify-center pt-6 sm:pt-8">
      <div>
        <Link href="/">
          <ApplicationLogo className="h-12 w-12 fill-current text-gray-500" />
        </Link>
      </div>
      <div className="mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
        {children}
      </div>
    </div>
  );
}
