// // import 'core-js/features/symbol/async-iterator.js'
// import pipeline from 'readable-stream/lib/internal/streams/pipeline.js'
// import PassThrough from 'readable-stream/lib/_stream_passthrough.js'
// import Client from './abstract_client.js'
// import event_iterator from 'event-iterator'

// const {
//   stream: subscribe,
// } = event_iterator
// const promisify = (fn, thisArgument = fn) => (...parameters) =>
//   new Promise(callback => {
//     Reflect.apply(
//         fn, thisArgument, [...parameters, callback],
//     )
//   })

// export default class Web_Client extends Client {
//   constructor(options) {
//     super(options, {
//       stream: {
//         pipeline,
//         PassThrough,
//       },
//       util: {
//         promisify,
//       },
//       events: {
//         async *on(listener, event) {
//           yield* subscribe.call(listener, event)
//         },
//       },
//     })
//   }
// }
