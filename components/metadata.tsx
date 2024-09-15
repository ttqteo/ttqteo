import { appConfig } from "@/lib/config";

interface Props {
  title: string;
  description?: string;
}

export default function Metadata({ title, description }: Props) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
    </>
  );
}

export function siteMetadata(name: string) {
  return `${appConfig.name} | ${name}`;
}
