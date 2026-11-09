"""Shot library for the Solo Leveling study edit: (source prefix, crop x-centre, kind).
Anime recordings are iPad screen captures with the 16:9 picture at y=127..1207."""
SRC = {
    'weak': '5763ab6c', 'eye': '2b57d97a', 'white': 'fceaffad', 'shock': 'd4468a93', 'girl': '2365424c',
    'army': '823e5592', 'aura': 'bc2e7347', 'clash': '7bc40450', 'ice': '12d8ef88', 'study': 'df1e249d',
}
# name: (src, x-centre in the 1920-wide picture; for study: (zoom, x-centre, y-centre) in the 1080x1920 frame)
CX = {
    'weak': 1180, 'eye': 960, 'white': 1420, 'shock': 600, 'girl': 720, 'army': 1100,
    'aura': 960, 'clash': 480, 'ice': 960,
}
def vf(name, cx=None, study=None):
    """ffmpeg filter that crops a shot to 9:16 and scales it to 1080x1920."""
    if SRC[name] == 'df1e249d':
        z, sx, sy = study or (1.0, 540, 960)
        w, h = round(1080 / z / 2) * 2, round(1920 / z / 2) * 2
        x = int(min(max(sx - w / 2, 0), 1080 - w)); y = int(min(max(sy - h / 2, 0), 1920 - h))
        return f'crop={w}:{h}:{x}:{y},scale=1080:1920:flags=lanczos'
    c = cx if cx is not None else CX[name]
    x = int(min(max(c - 304, 0), 1920 - 608))
    return f'crop=608:1080:{x}:127,scale=1080:1920:flags=lanczos'
