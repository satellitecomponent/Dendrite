//frame();
var mousePathPos;
var current_time = undefined;
let regenAmount = 0;
let regenDebt = 0;
let avgfps = 0;
let panToI = new vec2(0, 0);
let panToI_prev = undefined;

//let manualConnectionOverride = false;

class NodeSimulation {
    constructor() {
        this.prevNodeScale = 1;
        this.current_time = undefined;
    }

    processSelectedNodes() {
        processScalingKeys();

        const movementAngle = getDirectionAngleFromKeyState();
        if (movementAngle !== null) SelectedNodes.move(movementAngle);
    }

    updateAutopilot(time) {
        let autopilot_travelDist = 0;
        let newPan = pan;

        if (autopilotReferenceFrame && autopilotSpeed !== 0) {
            if (panToI_prev === undefined) {
                panToI_prev = autopilotReferenceFrame.pos.scale(1);
                this.prevNodeScale = autopilotReferenceFrame.scale;
            }
            panToI = panToI.scale(1 - settings.autopilotRF_Iscale).plus(autopilotReferenceFrame.pos.minus(panToI_prev).scale(settings.autopilotRF_Iscale));
            newPan = pan.scale(1 - autopilotSpeed).plus(autopilotReferenceFrame.pos.scale(autopilotSpeed).plus(panToI));
            panToI_prev = autopilotReferenceFrame.pos.scale(1);

            if (autopilotReferenceFrame.scale !== this.prevNodeScale) {
                let scaleFactor = autopilotReferenceFrame.scale / this.prevNodeScale;
                const maxScaleChangePerFrame = 0.1;
                scaleFactor = Math.max(Math.min(scaleFactor, 1 + maxScaleChangePerFrame), 1 - maxScaleChangePerFrame);

                zoomTo = zoomTo.scale(scaleFactor);
                this.prevNodeScale = autopilotReferenceFrame.scale;
            }
        } else {
            newPan = pan.scale(1 - autopilotSpeed).plus(panTo.scale(autopilotSpeed));
            panToI_prev = undefined;
        }
        autopilot_travelDist = pan.minus(newPan).mag() / zoom.mag();
        if (autopilot_travelDist > settings.autopilotMaxSpeed) {
            newPan = pan.plus(newPan.minus(pan).scale(settings.autopilotMaxSpeed / autopilot_travelDist));
            const speedCoeff = Math.tanh(Math.log(settings.autopilotMaxSpeed / autopilot_travelDist + 1e-300) / 10) * 2;
            zoom = zoom.scale(1 - speedCoeff * autopilotSpeed);
        } else {
            zoom = zoom.scale(1 - autopilotSpeed).plus(zoomTo.scale(autopilotSpeed));
        }
        pan = newPan;
        if (coordsLive) {
            panInput.value = pan.ctostring();
            zoomInput.value = String(zoom.mag());
        }
    }

    updateMousePath() {
        if (mousePath == '') {
            mousePathPos = toZ(mousePos);
            mousePath = "M " + toSVG(mousePathPos).str() + " L ";
        }
        for (let i = 0; i < settings.orbitStepRate; i++) {
            mousePathPos = mand_step(mousePathPos, toZ(mousePos));
            if (toSVG(mousePathPos).isFinite() && toSVG(mousePathPos).mag2() < 1e60) {
                mousePath += toSVG(mousePathPos).str() + " "
            }
        }
    }

    updateMousePathWidth() {
        let width = zoom.mag() * 0.0005 * SVG.zoom;

        if (nodeMode && prevNode !== undefined) {
            svg_mousePath.setAttribute('d', "M " + toSVG(prevNode.pos).str() + " L " + toSVG(toZ(mousePos)).str());
            width *= 50;
        } else {
            svg_mousePath.setAttribute('d', mousePath);
        }

        if (!nodeMode && prevNode !== undefined) {
            prevNode = undefined;
            mousePath = '';
            svg_mousePath.setAttribute('d', '');
        }

        svg_mousePath.setAttribute('stroke-width', String(width));
    }

    updateFPS(time) {
        if (this.current_time === undefined) {
            this.current_time = time;
        }
        let dt = time - this.current_time;
        this.current_time = time;
        if (dt > 0) {
            const alpha = Math.exp(-1 * dt / 1000);
            avgfps = avgfps * alpha + (1 - alpha) * 1000 / dt;
        }
        Elem.byId('debug_layer').children[1].textContent = "fps:" + avgfps;
        Elem.byId('fps').textContent = Math.round(avgfps).toString() + " fps";
        return dt;
    }

    updateNodes(dt) {
        dt *= (1 - nodeMode_v) ** 5;
        for (const node of Graph.nodes) {
            node.step(dt);
            //let d = toZ(mousePos).minus(n.pos);
        }
        return this;
    }

    updateEdges(dt) {
        for (let e of Graph.edges) {
            e.step(dt);
        }
        return this;
    }

    updateRegen() {
        const lerp = Math.lerp;
        const random = Math.random;
        regenDebt = Math.min(16, regenDebt + lerp(settings.regenDebtAdjustmentFactor, regenAmount, Math.min(1, (nodeMode_v ** 5) * 1.01)));
        for (; regenDebt > 0; regenDebt--) {
            render_hair(random() * settings.renderSteps);
        }
        regenAmount = 0;
        nodeMode_v = lerp(nodeMode_v, nodeMode, 0.125);
    }

    nodeStep(time) {
        if (SelectedNodes.uuids.size > 0) this.processSelectedNodes();

        this.updateAutopilot(time);
        SVG.updateViewbox();
        this.updateMousePath();
        this.updateMousePathWidth();
        const dt = this.updateFPS(time);
        this.updateNodes(dt).updateEdges(dt).updateRegen();

        window.requestAnimationFrame(this.nodeStep.bind(this));
    }

    start() {
        window.requestAnimationFrame(this.nodeStep.bind(this));
    }
}

const nodeSimulation = new NodeSimulation();
nodeSimulation.start();
