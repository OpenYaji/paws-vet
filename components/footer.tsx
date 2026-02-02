import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/images/image.png"
                alt="PAWS Logo"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-lg font-bold">PAWS</span>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Professional pet care services dedicated to your beloved companions.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-primary-foreground/80 hover:text-primary-foreground text-sm">Home</Link></li>
              <li><Link href="/services" className="text-primary-foreground/80 hover:text-primary-foreground text-sm">Services</Link></li>
              <li><Link href="/products" className="text-primary-foreground/80 hover:text-primary-foreground text-sm">Products</Link></li>
              <li><Link href="/about" className="text-primary-foreground/80 hover:text-primary-foreground text-sm">About</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Information</h4>
            <ul className="space-y-2">
              <li><Link href="/faq" className="text-primary-foreground/80 hover:text-primary-foreground text-sm">FAQ</Link></li>
              <li><a href="tel:+1234567890" className="text-primary-foreground/80 hover:text-primary-foreground text-sm">(123) 456-7890</a></li>
              <li><a href="mailto:info@pawsclinic.com" className="text-primary-foreground/80 hover:text-primary-foreground text-sm">info@pawsclinic.com</a></li>
              <li className="text-primary-foreground/80 text-sm">Open Daily 9am - 5pm</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Location</h4>
            <p className="text-primary-foreground/80 text-sm">
              123 Pet Street<br />
              Veterinary City, VC 12345<br />
              United States
            </p>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-6 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} PAWS Veterinary Clinic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
