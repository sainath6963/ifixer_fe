export function PageMeta({
  title,
  description,
  image,
  socialPreview = false,
  noIndex = false,
}: {
  title: string;
  description: string;
  image?: string;
  socialPreview?: boolean;
  noIndex?: boolean;
}) {
  const documentTitle = title === 'iFixer' ? title : `${title} | iFixer`;
  const imagePath = image ?? (socialPreview ? '/og.png' : undefined);
  const socialImage = imagePath ? new URL(imagePath, window.location.origin).toString() : undefined;

  return (
    <>
      <title>{documentTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />
      <meta property="og:site_name" content="iFixer" />
      <meta property="og:type" content={image ? 'product' : 'website'} />
      <meta property="og:title" content={documentTitle} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content={socialImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={documentTitle} />
      <meta name="twitter:description" content={description} />
      {socialImage ? <meta property="og:image" content={socialImage} /> : null}
      {socialImage ? <meta name="twitter:image" content={socialImage} /> : null}
    </>
  );
}
