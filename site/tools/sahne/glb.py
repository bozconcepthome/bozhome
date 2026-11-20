import bpy, sys, mathutils
from mathutils import Vector
S, OUT = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=S + '/model.obj')
parts = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in parts: o.scale = (0.001,) * 3
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in parts for c in o.bound_box]
mn = Vector([min(p[i] for p in pts) for i in range(3)]); mx = Vector([max(p[i] for p in pts) for i in range(3)])
c = (mn + mx) / 2
m = bpy.data.materials.new('toz_boya_siyah'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.018, 0.018, 0.02, 1); b.inputs['Roughness'].default_value = 0.38; b.inputs['Metallic'].default_value = 0.35
for o in parts:
    o.location -= Vector((c.x, c.y, mn.z)); o.data.materials.clear(); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.transform_apply(location=True, scale=True)
bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=False)
print('GLB OK')
