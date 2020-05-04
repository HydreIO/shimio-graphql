export default async () => {
  // eslint-disable-next-line no-undef
  const stream = await globalThis.process?.release?.name ?
    import('stream') : import('readable-stream')
  return stream
}
