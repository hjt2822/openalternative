import type { MetaFunction } from "@remix-run/node"
import { json, useLoaderData } from "@remix-run/react"
import { Grid } from "~/components/Grid"
import { Intro } from "~/components/Intro"
import { LanguageRecord } from "~/partials/records/LanguageRecord"
import { languageManyPayload } from "~/services.server/api"
import { prisma } from "~/services.server/prisma"
import { JSON_HEADERS } from "~/utils/constants"
import { getMetaTags } from "~/utils/meta"

export const meta: MetaFunction<typeof loader> = ({ matches, data, location }) => {
  const { title, description } = data?.meta || {}

  return getMetaTags({
    location,
    title,
    description,
    parentMeta: matches.find(({ id }) => id === "root")?.meta,
  })
}

export const loader = async () => {
  const languages = await prisma.language.findMany({
    orderBy: [{ tools: { _count: "desc" } }, { name: "asc" }],
    include: languageManyPayload,
  })

  const meta = {
    title: "Most Popular Languages used in Open Source Software",
    description: "Browse top languages to find your best Open Source software options.",
  }

  return json({ meta, languages }, { headers: JSON_HEADERS })
}

export default function LanguagesIndex() {
  const { meta, languages } = useLoaderData<typeof loader>()

  return (
    <>
      <Intro {...meta} />

      <Grid className="md:gap-8">
        {languages.map(language => (
          <LanguageRecord key={language.slug} language={language} />
        ))}

        {!languages.length && <p className="col-span-full">No languages found.</p>}
      </Grid>
    </>
  )
}
