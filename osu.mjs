// osu file parser
// -- written by Cherry (ilovecherries@protonmail.com) 2021
// this is optimized for the usage of osu! mania maps, so it is incomplete
// on purpose

const OSU_PIXELS = [640, 480]

const splitByComma = (line) => {
    return line.split(',').map(x => x.trim())
}

class SectionParser {
    constructor() {
        this.data = {}
    }

    /**
     * @abstract
     */
    parseLine() {
        throw new Error("Not implemented")
    }
}

class NoneSection extends SectionParser {
    parseLine(line) {
    }
}

class TimingPointSection extends SectionParser {
    constructor() {
        super()
        this.data.points = []
    }

    parseLine(line) {
        const [time, beatLength, meter, sampleSet,
            sampleIndex, volume, uninherited, effects] = splitByComma(line).map(x => Number(x))
        this.data.points.push({
            time,
            beatLength,
            meter,
            sampleSet,
            sampleIndex,
            volume,
            uninherited,
            effects
        })
    }
}

class HitObjectSection extends SectionParser {
    constructor() {
        super()
        this.data.hits = []
    }

    parseLine(line) {
        const values = splitByComma(line)
        const [x, y, time, type] = values.map(x => Number(x))
        this.data.hits.push({ x, y, time, type })
    }
}

class ManiaHitObjectSection extends HitObjectSection {
    constructor(circleSize) {
        super()
        this.circleSize = circleSize
    }

    parseLine(line) {
        super.parseLine(line)
        const hit = this.data.hits.pop()
        const increments = OSU_PIXELS[0] / this.circleSize
        for (let i = 1; (i * increments) <= OSU_PIXELS[0]; i++) {
            if (hit.x <= Math.floor(i * increments)) {
                this.data.hits.push({ column: i - 1, time: hit.time, type: hit.type })
                return
            }
        }
        throw new Error("Not able to detect the column for mania")
    }
}


class KeyValueSection extends SectionParser {
    parseLine(line) {
        const [k, v] = line.split(':').map(x => x.trim())
        // if the value has a comma, try to parse it as an array of numbers
        if (v.includes(',')) {
            const numbers = v.split(',').map(x => Number(x.trim()))
            if (numbers.some(x => !Number.isNaN(x))) {
                this.data[k] = numbers
                return
            }
        }
        // try to parse it as a number
        const n = Number(v)
        if (!Number.isNaN(n)) {
            this.data[k] = n
            // otherwise, it's just a string
        } else {
            this.data[k] = v
        }
    }
}

export const parseOsu = (input) => {
    let data = {}
    const lines = input.split(/\r?\n/g).map(x => x.trim())
    for (let i = 0; i < lines.length; ++i) {
        // seek for a tag that has square brackets surrounding it
        const tagSearch = lines[i].match(/\[(\w+)\]/i)
        if (tagSearch !== null) {
            const tag = tagSearch[1]
            ++i
            let parser = undefined
            // check what kind of tag it is
            switch (tag) {
                case "General":
                case "Editor":
                case "Metadata":
                case "Difficulty":
                case "Colours":
                    parser = new KeyValueSection()
                    break
                case "HitObjects":
                    if (data.General === undefined) {
                        throw new Error("The General tag should've been read before HitObjects")
                    }
                    // mania
                    if (data.General.Mode === 3) {
                        parser = new ManiaHitObjectSection(data.Difficulty.CircleSize)
                    } else {
                        parser = new HitObjectSection()
                    }
                    break
                case "TimingPoints":
                    parser = new TimingPointSection()
                    break
                default:
                    parser = new NoneSection()
            }
            // read lines for a tag until we reach an empty line
            for (; (lines[i] !== '') && (i < lines.length); ++i) {
                parser.parseLine(lines[i])
            }
            data[tag] = parser.data
        }
    }
    return data
}

import { readFileSync } from 'fs'
const input = readFileSync('angel.osu').toString()

const osu = parseOsu(input);

console.log(osu)
console.log(osu.TimingPoints.points)