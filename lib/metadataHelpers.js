/*

type NksfUniqueKeys = {
  'author'?: string,
  'bankchain'?: string[],
  'characters'?: string[],
  'comment'?: string,
  'deviceType'?: string,
  'name'?: stringi,
  'types'?: TypesEnum[][],
  'uuid'?: string,
  'vendor'?: string,
  'modes'?: string[],
  'source'?: string, // (useful, if !=="other"
  'taxonomy_version'?: number | string, //(inutile)
  'tempo'?: number | string, (useful, if !==0
	'mood'?: string[];
	'genre'?: string[];
}

TypesEnum = {
  'Arp / Sequence',  'Bass',
  'Bowed Strings',   'Brass',
  'Drums',           'Ethnic World',
  'Flute',           'Genre',
  'Guitar',          'Mallet Instruments',
  'Mood',            'Organ',
  'Percussion',      'Piano / Keys',
  'Plucked Strings', 'Reed Instruments',
  'Sound Effects',   'Soundscapes',
  'Synth Lead',      'Synth Misc',
  'Synth Pad',       'Vocal',
  'Hits & Bits',     'Retro Land'
}
```

*/

const remapTypesEnum = (type/*: typeEnum */)=>{
	//remove special characters and potentially ambiguous names
	switch(type){
		case 'Arp / Sequence': return 'Arp Sequence';
		case 'Sound Effects': return 'sfx';
		case 'Hits & Bits': return "Hits Bits";
		case 'Piano / Keys': return "Piano Keys";
		case 'Reed Instruments': return "Reeds";
		case 'Retro Land': return "Retro";
		case 'Mallet Instruments': return "Mallets";
		case 'Synth Lead': return "Lead";
		case 'Synth Pad': return "Pad";
		default: return type;
	}
}

const findUnique = (value, index, self)=>(self.indexOf(value)===index);


/*
	nksfJSON: NksfUniqueKeys;
*/
const remapNksf2Vorbis = (nksfJson) => {
/*
Mapping nksf keys to vorbis keys,
here are the following correspondences.
	let vorbisJson = {
  author = AUTHOR
  bankchain = ALBUM
  characters = DESCRIPTION
  comment = PUBLISHER
  deviceType = PERFORMER
  name = TITLE
  types = ARTIST
  uuid = VERSION
  vendor = LABEL
  modes = COMMENT
  source = PART
  taxonomy_version = PARTNUMBER
  tempo = BPM
}
 */

	let vorbisJson = {}

	//create missing KVs from original metadata
	vorbisJson["GENRE"] = [];
	vorbisJson["ARRANGER"] = [];
	let typesTagValues = [];

	const treatTypes = (types/*: TypesEnum[][]*/) => {
		types.forEach((typeArray/*: TypesEnum[]*/)=>{
			if (typeArray[0].toLowerCase()==="genre") vorbisJson["GENRE"].push(typeArray.splice(1));
			if (typeArray[0].toLowerCase()==="mood") vorbisJson["ARRANGER"].push(typeArray.splice(1));
			else typesTagValues.push(typeArray);
		})
	}

	Object.keys(nksfJson).forEach(key=>{
		switch(key){
			case 'author': vorbisJson["AUTHOR"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'bankchain': vorbisJson["ALBUM"] = nksfJson[key].filter(findUnique).map(genre=>genre.replace(/[\W_]+/g," ")); break;
			case 'characters': vorbisJson["DESCRIPTION"] = nksfJson[key].filter(findUnique).map(genre=>genre.replace(/[\W_]+/g," ")); break;
			case 'comment': vorbisJson["PUBLISHER"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'deviceType': vorbisJson["PERFORMER"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'modes': vorbisJson["COMMENT"] = nksfJson[key].filter(findUnique).map(genre=>genre.replace(/[\W_]+/g," ")); break;
			case 'name': vorbisJson["TITLE"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'source': vorbisJson["PART"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'taxonomy_version': vorbisJson["PARTNUMBER"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'tempo': vorbisJson["BPM"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'types': treatTypes(nksfJson[key]); break;
			case 'uuid': vorbisJson["VERSION"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			case 'vendor': vorbisJson["LABEL"] = nksfJson[key].replace(/[\W_]+/g," "); break;
			default: vorbisJson[key.toUpperCase()] = nksfJson[key].replace(/[\W_]+/g," "); break;
		}
	})

	// remove duplicate values
	vorbisJson.GENRE = vorbisJson.GENRE.flat().filter(findUnique).map(genre=>genre.replace(/[\W_]+/g," "));
	vorbisJson.ARRANGER = vorbisJson.ARRANGER.flat().filter(findUnique).map(genre=>genre.replace(/[\W_]+/g," "));
	vorbisJson["TYPES"] = typesTagValues.flat().filter(findUnique).map(remapTypesEnum).map(genre=>genre.replace(/[\W_]+/g," "));

	return vorbisJson;
}

const metadataFieldBuilder = (key, value)=>{
	/* example query:
		vorbiscomment -a \
		-t "AUTHOR=Freelance Soundlabs" \
		filename
	*/
	if (Array.isArray(value)){
		return [ "-t", `${key.toUpperCase()}=${value.join(' ')}`  ];
	} else {
		return [ "-t", `${key.toUpperCase()}=${value}`  ];
	}
}

module.exports.remapNksf2Vorbis = remapNksf2Vorbis;
module.exports.metadataFieldBuilder = metadataFieldBuilder;