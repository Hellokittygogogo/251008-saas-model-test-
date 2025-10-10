import Link from "next/link";

export const metadata = {
  title: " - ChineseName.club",
};

export default function Page() {
  return (
    <div className="container max-w-3xl py-12 prose prose-neutral dark:prose-invert">
      <h1></h1>
      <p></p>
      <p>
        Back to <Link href="/">Home</Link>
      </p>
    </div>
  );
}
