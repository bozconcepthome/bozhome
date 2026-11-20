"""Boz Concept Home — yeni ürün sahneleme (Blender Cycles, CPU)
Kullanım: blender -b -P sahne.py -- <klasör> <çekim> <genişlik> <yükseklik> <örnek>
Çekimler: salon, salon_on, detay, studyo, studyo_on
"""
import bpy, bmesh, math, sys, mathutils
from mathutils import Vector

S, SHOT, W, H, SAMPLES = sys.argv[-5], sys.argv[-4], int(sys.argv[-3]), int(sys.argv[-2]), int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

# ---------------------------------------------------------------- model
bpy.ops.wm.obj_import(filepath=S + '/model.obj')
parts = [o for o in sc.objects if o.type == 'MESH']
for o in parts:
    o.scale = (0.001, 0.001, 0.001)
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in parts for c in o.bound_box]
mn = Vector([min(p[i] for p in pts) for i in range(3)]); mx = Vector([max(p[i] for p in pts) for i in range(3)])
ctr = (mn + mx) / 2
for o in parts:
    o.location -= Vector((ctr.x, ctr.y, mn.z))
    for p in o.data.polygons:
        p.use_smooth = True
HX, HY, HZ = (mx.x - mn.x) / 2, (mx.y - mn.y) / 2, (mx.z - mn.z)


def mat(name, color, rough=0.5, metal=0.0, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value = coat
    return m, b


# Elektrostatik toz boya — mat siyah
metal_m, _ = mat('toz_boya', (0.018, 0.018, 0.02), rough=0.38, metal=0.35, coat=0.15)
for o in parts:
    o.data.materials.clear(); o.data.materials.append(metal_m)


def box(name, size, loc, material, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new('bv', 'BEVEL'); md.width = bevel; md.segments = 6; md.limit_method = 'NONE'
        bpy.ops.object.shade_smooth()
    o.data.materials.append(material)
    return o


def noise_tex(m, b, scale, c1, c2, bump=0.0, detail=8):
    nt = m.node_tree; n = nt.nodes
    tx = n.new('ShaderNodeTexNoise'); tx.inputs['Scale'].default_value = scale; tx.inputs['Detail'].default_value = detail
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*c1, 1); ramp.color_ramp.elements[1].color = (*c2, 1)
    nt.links.new(tx.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    if bump:
        bp = n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
        nt.links.new(tx.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])


studio = SHOT.startswith('studyo')
# Sehpa halının ÜSTÜNE oturur (salon sahnesinde halı 8 mm)
HALI = 0.0 if studio else 0.008
for o in parts:
    o.location.z += HALI

if studio:
    # ------------------------------------------------ sonsuz fon stüdyo
    fon_m, fb = mat('fon', (0.86, 0.86, 0.87), rough=0.9)
    bpy.ops.mesh.primitive_plane_add(size=1)
    fon = bpy.context.object
    bm = bmesh.new()
    prof = [(-0.0, 6.0)]  # (y, z) eğrisi: zemin -> kavis -> duvar
    pts2 = []
    for i in range(0, 31):
        t = i / 30
        if t < 0.6: y, z = -4 + t / 0.6 * 4.6, 0
        else:
            a = (t - 0.6) / 0.4 * (math.pi / 2); r = 0.8
            y, z = 0.6 + r * math.sin(a), r * (1 - math.cos(a))
        pts2.append((y, z))
    pts2.append((1.4, 4.0))
    verts = []
    for x in (-5, 5):
        verts.append([bm.verts.new((x, y, z)) for y, z in pts2])
    for i in range(len(pts2) - 1):
        bm.faces.new((verts[0][i], verts[1][i], verts[1][i + 1], verts[0][i + 1]))
    bm.to_mesh(fon.data); bm.free()
    fon.data.materials.append(fon_m)
    for p in fon.data.polygons: p.use_smooth = True
    # ışıklar: büyük softbox + dolgu + arka kenar
    def area(name, loc, size, energy, color=(1, 1, 1), target=(0, 0, 0.25)):
        l = bpy.data.lights.new(name, 'AREA'); l.size = size; l.energy = energy; l.color = color
        o = bpy.data.objects.new(name, l); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    area('key', (-1.6, -1.4, 1.9), 1.8, 420, (1, 0.97, 0.93))
    area('fill', (1.8, -1.2, 0.8), 2.2, 120, (0.93, 0.96, 1))
    area('rim', (0.6, 1.6, 1.6), 1.0, 160)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.9, 0.9, 0.92, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.25
else:
    # ------------------------------------------------ salon
    # Ahşap zemin (meşe parke): tuğla dokusu = parke dizilimi, gürültü = damar
    zem_m, zb = mat('parke', (0.4, 0.28, 0.18), rough=0.42)
    nt = zem_m.node_tree; n = nt.nodes
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping')
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    br = n.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.0
    br.inputs['Brick Width'].default_value = 1.2; br.inputs['Row Height'].default_value = 0.16
    br.inputs['Mortar Size'].default_value = 0.0015; br.offset = 0.37
    br.inputs['Color1'].default_value = (0.42, 0.29, 0.18, 1); br.inputs['Color2'].default_value = (0.33, 0.22, 0.14, 1)
    br.inputs['Mortar'].default_value = (0.12, 0.08, 0.05, 1)
    nt.links.new(mp.outputs['Vector'], br.inputs['Vector'])
    grain = n.new('ShaderNodeTexWave'); grain.inputs['Scale'].default_value = 9; grain.inputs['Distortion'].default_value = 6
    grain.inputs['Detail'].default_value = 6
    mpg = n.new('ShaderNodeMapping'); mpg.inputs['Scale'].default_value = (0.15, 1.6, 1)
    nt.links.new(tc.outputs['Object'], mpg.inputs['Vector']); nt.links.new(mpg.outputs['Vector'], grain.inputs['Vector'])
    mix = n.new('ShaderNodeMixRGB'); mix.blend_type = 'MULTIPLY'; mix.inputs['Fac'].default_value = 0.35
    nt.links.new(br.outputs['Color'], mix.inputs['Color1']); nt.links.new(grain.outputs['Color'], mix.inputs['Color2'])
    nt.links.new(mix.outputs['Color'], zb.inputs['Base Color'])
    bp = n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.08
    nt.links.new(br.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], zb.inputs['Normal'])
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); bpy.context.object.data.materials.append(zem_m)

    # Duvar: sıcak gri sıva + ahşap çıta panel
    duv_m, db = mat('siva', (0.62, 0.58, 0.53), rough=0.92)
    noise_tex(duv_m, db, 40, (0.6, 0.56, 0.51), (0.66, 0.62, 0.57), bump=0.05)
    box('duvar', (12, 0.1, 4), (0, 1.25, 2), duv_m)
    box('yan_duvar', (0.1, 12, 4), (-2.4, 0, 2), duv_m)
    cita_m, cb = mat('ceviz', (0.2, 0.12, 0.07), rough=0.5)
    noise_tex(cita_m, cb, 25, (0.17, 0.1, 0.06), (0.26, 0.16, 0.09), bump=0.02)
    for i in range(34):
        box(f'cita{i}', (0.028, 0.03, 2.6), (-1.6 + i * 0.05, 1.19, 1.3), cita_m)

    # Halı: kırık beyaz, bukle doku
    hali_m, hb = mat('hali', (0.78, 0.74, 0.67), rough=1.0)
    noise_tex(hali_m, hb, 320, (0.7, 0.66, 0.59), (0.83, 0.8, 0.74), bump=0.6, detail=4)
    box('hali', (2.4, 1.8, 0.008), (0.7, -0.35, 0.004), hali_m, bevel=0.003)

    # Kanepe: gri bukle kumaş, sehpanın sağında
    kum_m, kb = mat('kumas', (0.36, 0.35, 0.33), rough=1.0)
    noise_tex(kum_m, kb, 260, (0.3, 0.29, 0.27), (0.42, 0.41, 0.39), bump=0.5, detail=5)
    kx = HX + 0.06
    box('kanepe_taban', (2.3, 0.96, 0.22), (kx + 1.16, 0.63, 0.2), kum_m, bevel=0.05)
    box('kanepe_kol', (0.24, 1.02, 0.62), (kx + 0.12, 0.61, 0.33), kum_m, bevel=0.06)
    box('oturak1', (1.0, 0.82, 0.18), (kx + 0.78, 0.55, 0.4), kum_m, bevel=0.07)
    box('oturak2', (1.0, 0.82, 0.18), (kx + 1.8, 0.55, 0.4), kum_m, bevel=0.07)
    box('arkalik', (2.05, 0.26, 0.5), (kx + 1.27, 1.0, 0.68), kum_m, bevel=0.1)
    box('yastik', (0.48, 0.16, 0.42), (kx + 0.55, 0.82, 0.68), kum_m, bevel=0.07, rot=(math.radians(-12), 0, math.radians(8)))
    # Battaniye: kolun üstünden sarkan örgü
    bat_m, bb = mat('battaniye', (0.55, 0.5, 0.43), rough=1.0)
    noise_tex(bat_m, bb, 90, (0.48, 0.43, 0.36), (0.6, 0.55, 0.48), bump=0.8, detail=3)
    box('battaniye', (0.27, 0.6, 0.035), (kx + 0.12, 0.55, 0.655), bat_m, bevel=0.012)
    box('battaniye_sarkan', (0.035, 0.6, 0.35), (kx - 0.005, 0.55, 0.48), bat_m, bevel=0.012)

    # Gün ışığı: Nishita gökyüzü + pencereden giren güneş
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    sky = w.node_tree.nodes.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'
    sky.sun_elevation = math.radians(28); sky.sun_rotation = math.radians(250); sky.sun_intensity = 0.4
    w.node_tree.links.new(sky.outputs['Color'], w.node_tree.nodes['Background'].inputs['Color'])
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.35
    sun = bpy.data.lights.new('gunes', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(2.5); sun.color = (1, 0.9, 0.78)
    so = bpy.data.objects.new('gunes', sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(58), 0, math.radians(-62))
    l = bpy.data.lights.new('pencere', 'AREA'); l.size = 2.2; l.energy = 260; l.color = (0.92, 0.95, 1)
    lo = bpy.data.objects.new('pencere', l); sc.collection.objects.link(lo); lo.location = (-2.2, -1.2, 1.5)
    lo.rotation_euler = (Vector((0, 0, 0.3)) - lo.location).to_track_quat('-Z', 'Y').to_euler()
    l2 = bpy.data.lights.new('dolgu', 'AREA'); l2.size = 3; l2.energy = 90; l2.color = (1, 0.93, 0.85)
    lo2 = bpy.data.objects.new('dolgu', l2); sc.collection.objects.link(lo2); lo2.location = (1.5, -2.6, 1.8)
    lo2.rotation_euler = (Vector((0, 0, 0.3)) - lo2.location).to_track_quat('-Z', 'Y').to_euler()

# ---------------------------------------------------------------- sehpa üstü aksesuar (iki sahnede de)
kitap1, kb1 = mat('kitap1', (0.32, 0.09, 0.045), rough=0.6)
kitap2, kb2 = mat('kitap2', (0.86, 0.83, 0.76), rough=0.7)
sayfa, _ = mat('sayfa', (0.93, 0.91, 0.85), rough=0.8)
seramik, _ = mat('seramik', (0.9, 0.88, 0.84), rough=0.25, coat=0.6)
top = HZ + HALI
box('kitap_alt', (0.24, 0.17, 0.028), (-0.04, -0.01, top + 0.014 + 0.003), kitap2, bevel=0.002, rot=(0, 0, math.radians(-6)))
box('kitap_ust', (0.2, 0.145, 0.022), (-0.03, -0.02, top + 0.028 + 0.011 + 0.003), kitap1, bevel=0.002, rot=(0, 0, math.radians(9)))
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.042, depth=0.09, location=(0.12, 0.05, top + 0.048))
fincan = bpy.context.object; fincan.data.materials.append(seramik); bpy.ops.object.shade_smooth()
md = fincan.modifiers.new('bv', 'BEVEL'); md.width = 0.004; md.segments = 4
bpy.ops.mesh.primitive_torus_add(major_radius=0.024, minor_radius=0.006, location=(0.168, 0.05, top + 0.05), rotation=(math.radians(90), 0, 0))
kulp = bpy.context.object; kulp.data.materials.append(seramik); bpy.ops.object.shade_smooth()
kahve, _ = mat('kahve', (0.06, 0.03, 0.015), rough=0.05)
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.038, depth=0.002, location=(0.12, 0.05, top + 0.085))
bpy.context.object.data.materials.append(kahve)

# ---------------------------------------------------------------- kamera
cam_d = bpy.data.cameras.new('cam'); cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
SHOTS = {
    #  ad          (azimut, yükseklik_m, mesafe, odak_mm, hedef_z, f_stop)
    'salon':      (-35, 1.0, 2.15, 30, 0.3, 4.0),
    'salon_on':   (0,   0.45, 2.0, 32, 0.28, 4.0),
    'detay':      (-32, 0.42, 0.72, 50, 0.22, 2.2),
    'studyo':     (-35, 1.05, 2.4, 45, 0.23, 0),
    'studyo_on':  (0,   0.25, 2.4, 45, 0.23, 0),
}
az, ch, dist, lens, tz, fs = SHOTS[SHOT]
a = math.radians(az)
cam.location = (dist * math.sin(a), -dist * math.cos(a), ch)
tgt = Vector((0, 0, tz)) if SHOT != 'detay' else Vector((-0.08, -HY, 0.22))
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam_d.lens = lens; cam_d.sensor_fit = 'VERTICAL' if H > W else 'HORIZONTAL'; cam_d.sensor_width = 36; cam_d.sensor_height = 24
if fs:
    cam_d.dof.use_dof = True; cam_d.dof.focus_distance = (tgt - cam.location).length; cam_d.dof.aperture_fstop = fs

# ---------------------------------------------------------------- render
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
sc.cycles.use_denoising = False
sc.cycles.max_bounces = 8
sc.cycles.use_light_tree = True
sc.cycles.sample_clamp_indirect = 6.0
sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
sc.render.image_settings.file_format = 'PNG'
sc.render.filepath = f'{S}/out_{SHOT}.png'
bpy.ops.render.render(write_still=True)
print('BITTI', SHOT, HX * 2, HY * 2, HZ)
