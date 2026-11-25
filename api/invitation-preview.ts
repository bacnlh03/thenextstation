type Request = {
  query?: Record<string, string | string[] | undefined>
  headers?: Record<string, string | string[] | undefined>
}

type Response = {
  status: (code: number) => Response
  setHeader: (name: string, value: string) => void
  end: (body: string) => void
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character]
  })
}

export default function handler(req: Request, res: Response) {
  const slug = first(req.query?.slug)
  const language = first(req.query?.lang) === 'en' ? 'en' : 'vi'

  if (!slug) {
    res.status(302)
    res.setHeader('Location', '/')
    res.end('')
    return
  }

  const host = first(req.headers?.host) || 'thenextstation.vercel.app'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const invitationUrl = `${protocol}://${host}/to/${encodeURIComponent(slug)}`
  const appUrl = `/invitation?id=${encodeURIComponent(slug)}&lang=${language}`
  const safeInvitationUrl = escapeHtml(invitationUrl)
  const safeAppUrl = escapeHtml(appUrl)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.status(200).end(`<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thiệp Mời Lễ Tốt Nghiệp - Ngọc Trâm</title>
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${safeInvitationUrl}" />
    <meta property="og:title" content="Thiệp Mời Lễ Tốt Nghiệp - Ngọc Trâm" />
    <meta property="og:description" content="Trân trọng kính mời bạn đến chung vui và lưu giữ những khoảnh khắc đáng nhớ cùng mình tại Lễ Tốt Nghiệp!" />
    <meta property="og:image" content="https://${host}/preview.png" />
    <meta property="og:image:secure_url" content="https://${host}/preview.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Thiệp Mời Lễ Tốt Nghiệp - Ngọc Trâm" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Thiệp Mời Lễ Tốt Nghiệp - Ngọc Trâm" />
    <meta name="twitter:description" content="Trân trọng kính mời bạn đến chung vui và lưu giữ những khoảnh khắc đáng nhớ cùng mình tại Lễ Tốt Nghiệp!" />
    <meta name="twitter:image" content="https://${host}/preview.png" />
    <meta http-equiv="refresh" content="0;url=${safeAppUrl}" />
  </head>
  <body>
    <script>location.replace(${JSON.stringify(appUrl)})</script>
    <a href="${safeAppUrl}">Mở thiệp mời</a>
  </body>
</html>`)
}
