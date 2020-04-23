var JsonToArray = function(str)
{
	// var str = JSON.stringify(json, null, 0);
	var ret = new Uint8Array(str.length);
	for (var i = 0; i < str.length; i++) {
		ret[i] = str.charCodeAt(i);
	}
	return ret
};

function json2Array(str)

var binArrayToJson = function(binArray)
{
	var str = "";
	for (var i = 0; i < binArray.length; i++) {
		str += String.fromCharCode(parseInt(binArray[i]));
	}
	return str
}

function bench(exec) {
  console.log('start')
  const start = Date.now()
  exec()
  console.log(`${Date.now() - start}ms`)
}

const max = 1_000_000
const string = JSON.stringify({ foo: 'baddddddddwregtgtergvqtgrwqtgevrebertbvervr', hello: 1 })

const st1 = JsonToArray(string)
const test_second = () => {
  for (let i = 0; i < max; i++) JsonToArray(binArrayToJson(st1))
}


bench(test_second)
bench(test_second)
bench(test_second)
