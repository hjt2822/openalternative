import { getRandomElement } from "@curiousleaf/utils"
import type { Prisma } from "@prisma/client"
import {
  type HeadersFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
} from "@remix-run/node"
import { Link, type ShouldRevalidateFunction, useLoaderData } from "@remix-run/react"
import { MoveRightIcon } from "lucide-react"
import { BackButton } from "~/components/BackButton"
import { BreadcrumbsLink } from "~/components/Breadcrumbs"
import { Button } from "~/components/Button"
import { Grid } from "~/components/Grid"
import { H2 } from "~/components/Heading"
import { Intro } from "~/components/Intro"
import { Markdown } from "~/components/Markdown"
import { ToolRecord } from "~/partials/records/ToolRecord"
import { type LicenseOne, toolManyPayload } from "~/services.server/api"
import { prisma } from "~/services.server/prisma"
import { JSON_HEADERS } from "~/utils/constants"
import { getMetaTags } from "~/utils/meta"
import { combineServerTimings, makeTimings, time } from "~/utils/timing.server"

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentParams,
  currentUrl,
  nextParams,
  nextUrl,
}) => {
  return currentUrl.pathname !== nextUrl.pathname || currentParams.slug !== nextParams.slug
}

export const handle = {
  breadcrumb: (data?: { license: LicenseOne }) => {
    if (!data?.license) return <BackButton to="/licenses" />

    const { slug, name } = data.license

    return <BreadcrumbsLink to={`/licenses/${slug}`} label={name} />
  },
}

export const meta: MetaFunction<typeof loader> = ({ matches, data, location }) => {
  const { title, description } = data?.meta || {}

  return getMetaTags({
    location,
    title,
    description,
    parentMeta: matches.find(({ id }) => id === "root")?.meta,
  })
}

export const headers: HeadersFunction = ({ loaderHeaders, parentHeaders }) => {
  return {
    "Server-Timing": combineServerTimings(parentHeaders, loaderHeaders),
  }
}

export const loader = async ({ params: { slug } }: LoaderFunctionArgs) => {
  const timings = makeTimings("tool loader")

  try {
    const [license, tools] = await Promise.all([
      time(
        () =>
          prisma.license.findUniqueOrThrow({
            where: { slug },
          }),
        { type: "find license", timings },
      ),
      time(
        async () => {
          const relatedWhereClause = {
            license: { slug },
            publishedAt: { lte: new Date() },
          } satisfies Prisma.ToolWhereInput

          const take = 3
          const itemCount = await prisma.tool.count({ where: relatedWhereClause })
          const skip = Math.max(0, Math.floor(Math.random() * itemCount) - take)
          const properties = [
            "id",
            "name",
            "score",
          ] satisfies (keyof Prisma.ToolOrderByWithRelationInput)[]
          const orderBy = getRandomElement(properties)
          const orderDir = getRandomElement(["asc", "desc"] as const)

          return prisma.tool.findMany({
            where: relatedWhereClause,
            include: toolManyPayload,
            orderBy: { [orderBy]: orderDir },
            take,
            skip,
          })
        },
        { type: "find tools", timings },
      ),
    ])

    const meta = {
      title: `The ${license.name} License Explained: Pros, Cons, and Use Cases`,
      description: license.description,
    }

    return json(
      { meta, license, tools },
      { headers: { "Server-Timing": timings.toString(), ...JSON_HEADERS } },
    )
  } catch {
    throw json(null, { status: 404, statusText: "Not Found" })
  }
}

export default function LicensesPage() {
  const { meta, license, tools } = useLoaderData<typeof loader>()

  return (
    <>
      <Intro {...meta} />

      {!!tools.length && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <H2>{license.name} Licensed Software Examples</H2>

            <Button size="md" variant="secondary" suffix={<MoveRightIcon />} asChild>
              <Link to={"tools"}>View All Tools</Link>
            </Button>
          </div>

          <Grid>
            {tools.map(tool => (
              <ToolRecord key={tool.id} tool={tool} />
            ))}
          </Grid>
        </div>
      )}

      {license.content && (
        <>
          <H2>What is {license.name} License?</H2>
          <Markdown className="-mt-5">{license.content}</Markdown>
        </>
      )}

      <BackButton to="/licenses" />
    </>
  )
}
