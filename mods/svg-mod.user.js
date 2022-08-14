// ==UserScript==

// @name         SVG Mod
// @author       Conqu3red
// @description  Linerider.com userscript for converting svgs to lines
// @version      1.0

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @grant        none
// @require      https://gist.githubusercontent.com/Conqu3red/49c02eb4693c81c4f58de0c7454bb1de/raw/fcc77410e7ff0e6646794f1e01ac68d640149c20/svg-parser.js
// @require      http://cdnjs.cloudflare.com/ajax/libs/raphael/2.1.0/raphael-min.js
// @require      https://cdn.jsdelivr.net/npm/opentype.js@latest/dist/opentype.min.js

// ==/UserScript==

// Utility functions called towards source code

const updateLines = (linesToRemove, linesToAdd, name) => ({
    type: 'UPDATE_LINES',
    payload: {
        linesToRemove,
        linesToAdd
    },
    meta: {
        name: name
    }
})

const addLines = (line) => updateLines(null, line, 'ADD_LINES')

const commitTrackChanges = () => ({
    type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
    type: 'REVERT_TRACK_CHANGES'
})

const getSimulatorCommittedTrack = state => state.simulator.committedEngine

// Class to hold back-end information

class SvgMod {
    constructor(store, initState) {
        this.store = store
        this.state = initState

        this.changed = false

        this.track = this.store.getState().simulator.committedEngine

        store.subscribeImmediate(() => {
            this.onUpdate()
        })
    }

    // Committing changes

    commit() {
        if (this.changed) {
            this.store.dispatch(commitTrackChanges())
            this.store.dispatch(revertTrackChanges())
            this.changed = false
            return true
        }
    }

    onUpdate(nextState = this.state) {
        let shouldUpdate = false

        // Preview the lines if the mod is active

        if (!this.state.active && nextState.active) {
            window.previewLinesInFastSelect = true
        }
        if (this.state.active && !nextState.active) {
            window.previewLinesInFastSelect = false
        }

        // Update when user changes inputs of UI component

        if (this.state !== nextState) {
            this.state = nextState
            shouldUpdate = true
        }

        // Update when specific changes in track happen

        if (this.state.active) {
            const track = getSimulatorCommittedTrack(this.store.getState())

            if (this.track !== track) {
                this.track = track
                shouldUpdate = true
            }
        }

        // Changes made on update

        if (shouldUpdate) {

            if (this.changed) {
                this.store.dispatch(revertTrackChanges())
                this.changed = false
            }

            if (this.state.active) {
                let myLines = []

                // Add any mod logic here

                // Example: Creates a line based on slider values

                for (let {
                        p1,
                        p2
                    } of genLines(this.state)) {
                    myLines.push({
                        x1: p1.x,
                        y1: p1.y,
                        x2: p2.x,
                        y2: p2.y,
                        type: 2
                    })
                }

                if (myLines.length > 0) {
                    this.store.dispatch(addLines(myLines))
                    this.changed = true
                }
            }
        }
    }
}

// Function to create UI component

function main() {
    const {
        React,
        store
    } = window

    const create = React.createElement

    // Class to hold front-end information

    class SvgModComponent extends React.Component {
        constructor(props) {
            super(props)

            this.state = {
                active: false,

                // Add any input variables used in UI here

                // Example: components of a rectangle

                fontFile: null,
                fontName: "",
                text: "",

                tolerance: 0.5,
                xOffs: 0,
                yOffs: 0,
                fontSize: 72,
            }

            // Pull from logic class

            this.myMod = new SvgMod(store, this.state)

            // Function called when window updates

            store.subscribe(() => {

            })
        }

        componentWillUpdate(nextProps, nextState) {
            this.myMod.onUpdate(nextState)
        }

        onActivate() {
            if (this.state.active) {

                //Do stuff when the mod is turned off here

                this.setState({
                    active: false,
                    text: ""
                })
            } else {

                //Do stuff when the mod is turned on here

                this.setState({
                    active: true
                })
            }
        }

        onFileChange() {
            return new Promise((resolve) => {
                const file = event.target.files[0];
                const fileReader = new FileReader();
                fileReader.fileName = event.target.files[0].name;
                fileReader.onloadend = (e) => {
                    try {
                        const result = fileReader.result;
                        const font = opentype.parse(result);
                        resolve(font);
                    } catch (e) {
                        console.log("Error when parsing: Unsupported font");
                        console.log(e);
                    }
                }
                fileReader.readAsArrayBuffer(file);
            });
        }

        onCommit() {
            const committed = this.myMod.commit()
            if (committed) {
                this.setState({
                    active: false,
                    text: ""
                })
            }
        }

        /*

        Creates a slider element from an input variable given from this.state

        @param {key} The input variable stored in this.state
        @param {title} Title displayed on the UI element
        @param {props} The UI properties issued to the slider element

        */

        renderSlider(key, title, props) {
            props = {
                ...props,
                value: this.state[key],
                onChange: create => this.setState({
                    [key]: parseFloat(create.target.value)
                })
            }

            return create('div', null,
                title,
                create('input', {
                    style: {
                        width: '3em'
                    },
                    type: 'number',
                    ...props
                }),
                create('input', {
                    type: 'range',
                    ...props,
                    onFocus: create => create.target.blur()
                })
            )
        }

        // Main render function

        render() {
            return create('div', null,
                this.state.active && create('div', null,
                    // Render UI elements for the mod here

                    // Example: Rectangle inputs width, height, x, y

                    create('div', null,
                        'Font: ',
                        create('input', {
                            type: 'file',
                            onChange: create => this.onFileChange().then(result => {
                                //result = normalizeLines(result);
                                this.setState({
                                    fontFile: result
                                });
                                this.setState({
                                    fontName: result.fileName
                                });
                                console.log("Loaded " + result.fileName + " successfully");
                            }).catch(err => {
                                console.log("Error when parsing: Invalid font file");
                                console.log(err);
                            })
                        })
                    ),

                    this.state.fontFile != null && create('div', null, 'Loaded: ' + this.state.fontName),
                    this.state.fontFile != null && create('div', null,
                        "Text: ",
                        create('textArea', {
                            style: {
                                width: '88%'
                            },
                            type: 'text',
                            value: this.state.text,
                            onChange: create => this.setState({
                                text: create.target.value
                            })
                        })
                    ),
                    this.renderSlider('tolerance', 'Tolerance', {
                        min: 0.001,
                        max: 0.5,
                        step: 0.001
                    }),
                    this.renderSlider('xOffs', 'X Offset', {
                        min: -500,
                        max: 500,
                        step: 10
                    }),
                    this.renderSlider('yOffs', 'Y Offset', {
                        min: -500,
                        max: 500,
                        step: 10
                    }),
                    this.renderSlider('fontSize', 'Font Size', {
                        min: 10,
                        max: 250,
                        step: 1
                    }),

                    // Commit changes button

                    create('button', {
                            style: {
                                float: 'left'
                            },
                            onClick: () => this.onCommit()
                        },
                        'Commit'
                    )
                ),

                // Creates main mod button here

                create('button', {
                        style: {
                            backgroundColor: this.state.active ? 'lightblue' : null
                        },
                        onClick: this.onActivate.bind(this)
                    },
                    'SVG Mod'
                )
            )
        }
    }

    window.registerCustomSetting(SvgModComponent)
}

// Initializes mod

if (window.registerCustomSetting) {
    main()
} else {
    const prevCb = window.onCustomToolsApiReady
    window.onCustomToolsApiReady = () => {
        if (prevCb) prevCb()
        main()
    }
}

// Utility functions can go here

// Example: Generate a rectangle from inputs

function encodePathAsString(path) {
    let str = "";
    for (const e of path) {
        str += e[0];
        str += e.splice(1).join(" ");
    }

    if (!str.endsWith("Z")) str += "Z";

    return str;
}

function generateLines(pathSections, opts = undefined) {
    opts = opts ? opts : {
        tolerance: 1
    };
    let allLines = [];
    let curLines = [];

    const tolerance2 = opts.tolerance * opts.tolerance;

    let add = (x, y) => curLines.push([x, y]);

    function sampleCubicBézier(x0, y0, x1, y1, x2, y2, x3, y3) {
        // Calculate all the mid-points of the line segments
        const x01 = (x0 + x1) / 2,
            y01 = (y0 + y1) / 2,
            x12 = (x1 + x2) / 2,
            y12 = (y1 + y2) / 2,
            x23 = (x2 + x3) / 2,
            y23 = (y2 + y3) / 2,
            x012 = (x01 + x12) / 2,
            y012 = (y01 + y12) / 2,
            x123 = (x12 + x23) / 2,
            y123 = (y12 + y23) / 2,
            x0123 = (x012 + x123) / 2,
            y0123 = (y012 + y123) / 2;

        // Try to approximate the full cubic curve by a single straight line
        const dx = x3 - x0,
            dy = y3 - y0;

        const d1 = Math.abs(((x1 - x3) * dy - (y1 - y3) * dx)),
            d2 = Math.abs(((x2 - x3) * dy - (y2 - y3) * dx));

        if (((d1 + d2) * (d1 + d2)) < (tolerance2 * (dx * dx + dy * dy))) add(x0123, y0123);
        else { // Continue subdivision
            sampleCubicBézier(x0, y0, x01, y01, x012, y012, x0123, y0123);
            sampleCubicBézier(x0123, y0123, x123, y123, x23, y23, x3, y3);
        }
    }

    for (const cmd of pathSections) {
        //console.log(cmd)
        switch (cmd.code) {
            case 'M':
                allLines.push(curLines = [
                    [cmd.x, cmd.y]
                ]);
                //polys.push(poly = []);
                // intentional flow-through
            case 'L':
            case 'H':
            case 'V':
            case 'Z':
                add(cmd.x, cmd.y);
                // if (cmd.code === 'Z') curLines.closed = true;
                break;

            case 'C':
                if (cmd.x1 == cmd.x0 && cmd.x2 == cmd.x && cmd.y1 == cmd.y0 && cmd.y2 == cmd.y)
                    add(cmd.x, cmd.y);
                else {
                    add(cmd.x0, cmd.y0);
                    sampleCubicBézier(cmd.x0, cmd.y0, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
                }

                break;

            default:
                console.error(cmd.command + ' commands (' + cmd.code + ') are not yet supported.');
                process.exit(2);
        }
    }

    return allLines;
}


function* genLines({
    text = "",
    fontFile = null,
    tolerance = 1,
    xOffs = 0,
    yOffs = 0,
    fontSize = 72,
} = {}) {
    const {
        V2
    } = window
    if (fontFile === null) return;

    //console.log(text)

    let path = fontFile.getPath(text, xOffs, yOffs, fontSize).toPathData(10) // x, y, baseline
    //console.log(path)
    let betterPath = Raphael.path2curve(path);
    let better = parserFunction.makeAbsolute(parserFunction.parseSVG(encodePathAsString(betterPath)));
    //console.log(better)

    let polys = generateLines(better, {
        tolerance: tolerance
    })
    /* let points = svgPathToPolygons(betterStr, {
        tolerance: 5,
        decimals: 1
    }) */

    let nlines = 0;

    for (const poly of polys) {
        nlines += poly.length;
        for (let i = 1; i < poly.length; i++) {
            yield {
                p1: V2.from(poly[i - 1][0], poly[i - 1][1]),
                p2: V2.from(poly[i][0], poly[i][1]),
            }
        }
        // TODO: add case when the poly is "closed"
    }

    console.log(nlines);

    /* let points = [];

    for (i = 0.0; i < length; i += delta) {
        let p = Raphael.getPointAtLength(path, i);
        points.push([p.x, p.y]);
    }

    console.log("Points:", points.length)
    console.log(points)

    // Create points from inputs

    for (let i = 1; i < points.length; i++) {
        yield {
            p1: V2.from(points[i - 1][0], points[i - 1][1]),
            p2: V2.from(points[i][0], points[i][1]),
        }
    } */


    /* const pointA = [xOff, yOff]
    const pointB = [xOff, yOff + height]
    const pointC = [xOff + width, yOff + height]
    const pointD = [xOff + width, yOff]

    // Return lines connecting points

    yield {
        p1: V2.from(pointA[0], pointA[1]),
        p2: V2.from(pointB[0], pointB[1])
    }

    yield {
        p1: V2.from(pointB[0], pointB[1]),
        p2: V2.from(pointC[0], pointC[1])
    }

    yield {
        p1: V2.from(pointC[0], pointC[1]),
        p2: V2.from(pointD[0], pointD[1])
    }

    yield {
        p1: V2.from(pointD[0], pointD[1]),
        p2: V2.from(pointA[0], pointA[1])
    } */
}