// frontend/src/components/Footer.tsx
// Site‑wide footer – reused inside the Layout.
function Footer(): React.JSX.Element {
  return (
    <footer className="bg-neutral-800 text-neutral-400 py-8 mt-auto">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm">
        © {new Date().getFullYear()} OmniMarket. Built with 💜.
      </div>
    </footer>
  );
}

export default Footer;
