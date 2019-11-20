const storeObjectOrEvent = async (runtime, collection, obj, k) => {
  // key is not required for Mongo objects.
  // We will likely use the key value (or set of values) in
  // later storage systems.
  await runtime.mongo.collection(collection).insertOne(obj)
}

module.exports = {
  storeObjectOrEvent
}
