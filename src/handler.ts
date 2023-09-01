import { TokenProvider } from './token'
import { Backend } from './backend'

const PROXY_HEADER_ALLOW_LIST: string[] = ["accept", "user-agent", "accept-encoding"]

const validActionNames = new Set(["manifests", "blobs", "tags", "referrers"])

const DEFAULT_BACKEND_HOST: string = "https://registry-1.docker.io"

export async function handleRequest(request: Request): Promise<Response> {
  return handleRegistryRequest(request)
}

function copyProxyHeaders(inputHeaders: Headers) : Headers {
  const headers = new Headers;
  for(const pair of inputHeaders.entries()) {
    if (pair[0].toLowerCase() in PROXY_HEADER_ALLOW_LIST) {
      headers.append(pair[0], pair[1])
    }
  }
  return headers
}

function orgNameFromPath(pathname: string): string|null {
  return null
}

function hostByOrgName(orgName: string|null): string {
  // if (orgName !== null && orgName in ORG_NAME_BACKEND) {
  //   return ORG_NAME_BACKEND[orgName]
  // }
  return DEFAULT_BACKEND_HOST
}

function rewritePath(orgName: string | null, pathname: string): string {
  let splitedPath = pathname.split("/");

  // /v2/repo/manifests/xxx -> /v2/library/repo/manifests/xxx
  // /v2/repo/blobs/xxx -> /v2/library/repo/blobs/xxx
  if (orgName === null && splitedPath.length === 5 && validActionNames.has(splitedPath[3])) {
    splitedPath = [splitedPath[0], splitedPath[1], "library", splitedPath[2], splitedPath[3], splitedPath[4]]
  }

  return splitedPath.join("/")
}

async function handleRegistryRequest(request: Request): Promise<Response> {
  const reqURL = new URL(request.url)
  const orgName = orgNameFromPath(reqURL.pathname)
  const pathname = rewritePath(orgName, reqURL.pathname)
  const host = hostByOrgName(orgName)
  const tokenProvider = new TokenProvider()
  const backend = new Backend(host, tokenProvider)
  const headers = copyProxyHeaders(request.headers)
  return backend.proxy(pathname, {headers: request.headers})
}
