//precision mediump float;

#version 120

varying vec2 vTextureCoord;
uniform sampler2D uSampler;

void main() {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
    gl_FragColor.r = 0;
}
