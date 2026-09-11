"""Additional authoring stages loaded into the visible session's namespace."""
import numpy as np
import bmesh

def refine_clips():
    # Reload the authored pose function only, preserving the actual sculpted scene.
    import types,runpy
    fresh=runpy.run_path(str(ROOT/'source/tools/character-studio/build_characters.py'))
    globals()['pose']=types.FunctionType(fresh['pose'].__code__,globals(),'pose',fresh['pose'].__defaults__)
    stop_preview()
    for d in CHARS.values():
        rig=d['rig'];rig.animation_data.action=None
        for track in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(track)
    animations();save_source();status('Clip refinement / Root vertical axis corrected; crouch knee fold lowers hips.')

def uv_audit():
    data={c:[{'object':o.name,'uv':[{'name':u.name,'render':u.active_render} for u in o.data.uv_layers],'materials':[m.name for m in o.data.materials]} for o in d['objects']] for c,d in CHARS.items()}
    (EVIDENCE/'uv-audit.json').write_text(json.dumps(data,indent=2))

def unify_uv():
    # Blender's Chinese default sphere UV name differs from the procedural one.
    # A merged runtime mesh must use one UV set for every part of a material.
    for d in CHARS.values():
        for o in d['objects']:
            layer=o.data.uv_layers.active
            if layer:layer.name='UVMap';layer.active_render=True
    save_source();status('UV correction / Unified localized UV names so fleece normals cover the exported torso.')

def refine_forms():
    for c,d in CHARS.items():
        old=d['body'];d['objects'].remove(old);bpy.data.objects.remove(old,do_unlink=True)
        if c=='golden-frog':
            rows=[(.48,.07,.08,0),(.53,.20,.20,0),(.64,.32,.30,-.01),(.83,.39,.365,-.018),(1.04,.40,.36,-.005),(1.24,.35,.30,.014),(1.40,.27,.225,.033),(1.52,.205,.18,.04),(1.69,.177,.147,.045),(1.80,.16,.136,.045),(1.87,.116,.105,.045),(1.90,.04,.038,.045)]
            parts=[lathe(c,'Refined pear silhouette',rows,'gold')]
            for s in [-1,1]:
                parts.append(ell(c,'Organic shoulder',(s*.294,.014,1.303),(.119,.116,.14),'gold'))
                parts.append(tube(c,'Refined arm',[(s*.25,0,1.34),(s*.36,0,1.25),(s*.43,-.005,1.12),(s*.47,-.025,.94),(s*.465,-.045,.80)],[.105,.105,.085,.068,.049]))
                parts.append(tube(c,'Refined leg',[(s*.20,0,.66),(s*.225,.005,.51),(s*.25,.006,.35),(s*.26,-.018,.18),(s*.26,-.018,.10)],[.12,.107,.077,.041,.036]))
            d['body']=union(c,parts,'Continuous body',.012,7)
        else:
            rows=[(.48,.07,.09,.015),(.55,.22,.19,.015),(.68,.29,.235,.012),(.85,.33,.263,.01),(1.03,.315,.237,.013),(1.19,.29,.21,.02),(1.28,.265,.19,.025),(1.35,.165,.13,.025),(1.38,.09,.095,.025)]
            parts=[lathe(c,'Refined fleece torso',rows,'fur')]
            for s in [-1,1]:
                parts.append(ell(c,'Organic shoulder',(s*.25,.012,1.247),(.104,.099,.118),'fur'))
                parts.append(tube(c,'Refined arm',[(s*.215,.015,1.27),(s*.335,.012,1.13),(s*.385,-.005,.94),(s*.405,-.025,.77)],[.095,.093,.076,.058],'fur'))
                parts.append(tube(c,'Refined leg',[(s*.16,.018,.65),(s*.175,.012,.48),(s*.19,.005,.28),(s*.192,-.005,.13)],[(.135,.14),(.12,.125),(.10,.105),(.088,.09)],'fur'))
            d['body']=union(c,parts,'Continuous fleece suit',.011,5)
            for o in d['objects']:
                if o.get('bind') in ['Head','Jaw','EyeL','EyeR','LidL','LidR','EarL','EarR']:
                    for v in o.data.vertices:v.co.x*=1.13;v.co.y*=1.06;v.co.z=1.32+(v.co.z-1.32)*1.04
            for v in d['body'].data.vertices:
                n=noise_vector(v.co*76)[0]*.6+noise_vector(v.co*155)[1]*.4;v.co+=v.normal*n*.0033
    view(distance=4.5,rotation=(pi/2,0,0));status('Refinement / Blended shoulders and fuller bull head matched to turnaround proportions.')

def textures():
    # Refine the shoulder joins before skinning. These are sculpt smoothing passes.
    for c,d in CHARS.items():
        o=d['body'];vg=o.vertex_groups.get('Shoulder refinement') or o.vertex_groups.new(name='Shoulder refinement')
        for v in o.data.vertices:
            x,y,z=v.co
            zc=1.35 if c=='golden-frog' else 1.28
            w=exp(-((abs(x)-.29)/.10)**2-((z-zc)/.12)**2)
            if w>.01:vg.add([v.index],w,'REPLACE')
        active(o);m=o.modifiers.new('Soften shoulder joins','SMOOTH');m.factor=1.2;m.iterations=18;m.vertex_group=vg.name;bpy.ops.object.modifier_apply(modifier=m.name)
        if o.vertex_groups.get('Shoulder refinement'):o.vertex_groups.remove(o.vertex_groups['Shoulder refinement'])
    # A smooth color boundary follows the actual torso mesh without a floating shell.
    o=CHARS['golden-frog']['body'];o.data.materials.clear()
    m=material('Frog painted surface',(1,1,1),.6);p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='CharacterColor';m.node_tree.links.new(vc.outputs['Color'],p.inputs['Base Color']);o.data.materials.append(m)
    attr=o.data.color_attributes.new(name='CharacterColor',type='FLOAT_COLOR',domain='POINT')
    gold=np.array((1,.67,.008));belly=np.array((.84,.79,.65));olive=np.array((.16,.145,.078))
    for v in o.data.vertices:
        x,y,z=v.co;r=(x/.347)**2+((z-1.082)/.292)**2
        patch=max(0,min(1,(1-r)/.035))*max(0,min(1,(-y-.17)/.045))
        col=gold*(1-patch)+belly*patch
        extremity=max(0,min(1,(.85-z)/.065)) if abs(x)>.4 else max(0,min(1,(.16-z)/.05))
        col=col*(1-extremity)+olive*extremity;attr.data[v.index].color=(*col,1)
    # Seamless authored tangent normal texture: warped ridges + fine grain.
    n=512;v,u=np.mgrid[0:n,0:n]/n*2*pi
    warp=np.sin(u*3+np.sin(v*2))*.7+np.sin(v*5-u*2)*.25
    h=np.sin(u*13+v*7+warp*6)*.40+np.sin(v*17-u*5+warp*4)*.32+np.sin(u*31+v*23+warp*9)*.16+np.sin(v*67-u*59)*.05
    h=np.tanh(h*2)*.6+np.sin(u*113+v*97)*.025
    dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*2.3
    dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*2.3
    normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    rgba=np.ones((n,n,4),dtype=np.float32);rgba[:,:,:3]=normal*.5+.5
    im=bpy.data.images.new('Authored fleece tangent normal',width=n,height=n,alpha=False);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/'fleece-normal.png');im.file_format='PNG';im.save();im.pack()
    # All deformed meshes receive stable UVs. This map contains no baked light.
    for c,d in CHARS.items():
        for o in d['objects']:
            if o.type!='MESH':continue
            if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap')
            uv=o.data.uv_layers.active
            for p in o.data.polygons:
                axis=max(range(3),key=lambda i:abs(p.normal[i]));a,b=[i for i in range(3) if i!=axis]
                for li in p.loop_indices:
                    co=o.data.vertices[o.data.loops[li].vertex_index].co
                    uv.data[li].uv=(co[a]*2.2,co[b]*2.2)
            # Recalculate consistent outward normals, including swept horns and digits.
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();o.data.update()
    for name,strength in [('fur',.8),('horn',.40)]:
        m=MATS[name];nodes=m.node_tree.nodes;links=m.node_tree.links;p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
        tex=nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT';nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=strength;links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
    # Modest mesh decimation keeps silhouette and native skin weights editable.
    for c,d in CHARS.items():
        o=d['body'];active(o);mod=o.modifiers.new('Game-ready surface density','DECIMATE');mod.ratio=.56;bpy.ops.object.modifier_apply(modifier=mod.name)
    view(distance=4.5,rotation=(pi/2,0,0));save_source();status('06 / Shoulder refinement, smooth belly paint, fleece relief and portable normal map.')

def rig_view():
    for c,d in CHARS.items():
        active(d['rig'])
    for screen in bpy.data.screens:
        for a in screen.areas:
            if a.type=='VIEW_3D':a.spaces.active.overlay.show_extras=True
    view(distance=4.4,rotation=(pi/2,0,0))
    for screen in bpy.data.screens:
        for a in screen.areas:
            if a.type=='VIEW_3D':a.spaces.active.overlay.show_extras=True
    active(CHARS['golden-bull']['rig']);bpy.ops.object.mode_set(mode='POSE')
    status('07 / Pose mode: named, independent bones visible through both characters.')

def movement_preview():
    if bpy.context.object and bpy.context.object.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
    for c,d in CHARS.items():
        rig=d['rig'];track=next(t for t in rig.animation_data.nla_tracks if t.name=='Walk')
        rig.animation_data.action=track.strips[0].action
    bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=31;bpy.context.scene.frame_set(7)
    view(distance=4.5,rotation=(1.35,0,.25))
    # Starts actual UI playback in the visible window, never a background-only demo.
    if not bpy.context.screen.is_animation_playing:bpy.ops.screen.animation_play()
    status('08 / Live walk playback: arms, knees, ankles and tail deform on their own rigs.')

def stop_preview():
    if bpy.context.screen.is_animation_playing:bpy.ops.screen.animation_cancel(restore_frame=False)
    for c,d in CHARS.items():d['rig'].animation_data.action=None;pose(d['rig'],'Idle',0)
    bpy.context.scene.frame_set(1)

def polish():
    stop_preview()
    for c,d in CHARS.items():
        for o in d['objects']:
            bm=bmesh.new();bm.from_mesh(o.data);edges=[e for e in bm.edges if e.is_boundary]
            if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
            bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free();o.data.update()
    o=CHARS['golden-frog']['body'];attr=o.data.color_attributes['CharacterColor']
    gold=np.array((1,.67,.008));belly=np.array((.84,.79,.65));olive=np.array((.16,.145,.078))
    for v in o.data.vertices:
        x,y,z=v.co;r=(x/.355)**2+((z-1.09)/.303)**2
        patch=max(0,min(1,(1.04-r)/.13))*max(0,min(1,(-y-.16)/.065));patch=patch*patch*(3-2*patch)
        col=gold*(1-patch)+belly*patch
        edge=max(0,min(1,(.85-z)/.065)) if abs(x)>.4 else max(0,min(1,(.16-z)/.05));col=col*(1-edge)+olive*edge
        attr.data[v.index].color=(*col,1)
    for o in bpy.context.scene.objects:
        if o.type in ['LIGHT','CAMERA']:o.hide_set(True)
    save_source();status('Polish / Closed detail endcaps and softened painted belly boundary.')

def material_refinement():
    stop_preview()
    # Irregular short fleece folds instead of directional, corduroy-like waves.
    n=512;rng=np.random.default_rng(311);white=rng.normal(size=(n,n));freq=np.fft.fftfreq(n)*n
    fy,fx=np.meshgrid(freq,freq);radius=np.sqrt(fx*fx+fy*fy)
    spectrum=np.fft.fft2(white)*np.exp(-((radius-16)/12)**2)
    field=np.fft.ifft2(spectrum).real;field/=field.std()
    h=np.abs(np.sin(field*.95))*.65+np.fft.ifft2(np.fft.fft2(white)*np.exp(-((radius-70)/26)**2)).real*.18
    dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*1.7;dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*1.7
    normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    rgba=np.ones((n,n,4),dtype=np.float32);rgba[:,:,:3]=normal*.5+.5
    im=bpy.data.images['Authored fleece tangent normal'];im.pixels.foreach_set(rgba.ravel());im.save();im.pack()
    def setcolor(name,col):
        m=MATS[name];m.diffuse_color=(*col,1);next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(*col,1)
    setcolor('gold',(.78,.49,.003));setcolor('fur',(.76,.41,.003));setcolor('horn',(.068,.065,.048))
    o=CHARS['golden-frog']['body'];attr=o.data.color_attributes['CharacterColor'];gold=np.array((.78,.49,.003));belly=np.array((.74,.69,.55));olive=np.array((.12,.11,.057))
    for v in o.data.vertices:
        x,y,z=v.co;r=(x/.355)**2+((z-1.09)/.303)**2
        patch=max(0,min(1,(1.04-r)/.13))*max(0,min(1,(-y-.16)/.065));patch=patch*patch*(3-2*patch);col=gold*(1-patch)+belly*patch
        edge=max(0,min(1,(.85-z)/.065)) if abs(x)>.4 else max(0,min(1,(.16-z)/.05));col=col*(1-edge)+olive*edge;attr.data[v.index].color=(*col,1)
    bpy.context.scene.view_settings.view_transform='Standard';bpy.context.scene.view_settings.look='None';bpy.context.scene.view_settings.exposure=-.85
    view(distance=4.5,rotation=(1.4,0,.2));save_source();status('Material refinement / Irregular fleece folds, saturated yellow and dark grey horns.')

def inspect_model(c):
    d=CHARS[c];rig=d['rig'];report={'bones':len(rig.data.bones),'meshes':len(d['objects']),'vertices':0,'triangles':0,'unweighted':0,'bad_weight_sum':0,'max_influences':0,'nonfinite':0,'boundary_edges':0,'nonmanifold_edges':0}
    for o in d['objects']:
        if o.type!='MESH':continue
        report['vertices']+=len(o.data.vertices);o.data.calc_loop_triangles();report['triangles']+=len(o.data.loop_triangles)
        for v in o.data.vertices:
            weights=[g.weight for g in v.groups if g.weight>0];report['max_influences']=max(report['max_influences'],len(weights))
            report['unweighted']+=int(not weights);report['bad_weight_sum']+=int(abs(sum(weights)-1)>.01);report['nonfinite']+=int(not all(math.isfinite(f) for f in v.co))
        bm=bmesh.new();bm.from_mesh(o.data);report['boundary_edges']+=sum(e.is_boundary for e in bm.edges);report['nonmanifold_edges']+=sum(not e.is_manifold for e in bm.edges);bm.free()
    report['clips']=[t.name for t in rig.animation_data.nla_tracks]
    assert report['unweighted']==0 and report['bad_weight_sum']==0 and report['nonfinite']==0, report
    assert report['max_influences']<=4,report
    # Measure actual evaluated vertex displacement, not just keyframe existence.
    o=d['body'];dg=bpy.context.evaluated_depsgraph_get();pose(rig,'Idle',0);bpy.context.view_layer.update();rest=[v.co.copy() for v in o.evaluated_get(dg).data.vertices]
    pose(rig,'Walk',.25);bpy.context.view_layer.update();moved=[(v.co-r).length for v,r in zip(o.evaluated_get(dg).data.vertices,rest)]
    report['walk_max_vertex_displacement']=max(moved);report['walk_moved_vertices']=sum(v>.005 for v in moved);assert report['walk_max_vertex_displacement']>.03
    pose(rig,'Idle',0);return report

def export_models():
    stop_preview();reports={}
    for c,d in CHARS.items():
        reports[c]=inspect_model(c)
        root=d['root'];rig=d['rig'];old=root.location.copy();root.location=(0,0,0);root.scale=(.88,.88,.88)
        # Preserve all source parts. Only the runtime duplicate is merged by material.
        copies=[]
        for src in d['objects']:
            o=src.copy();o.data=src.data.copy();bpy.context.collection.objects.link(o);copies.append(o)
        active(copies[0])
        for o in copies:o.select_set(True)
        bpy.ops.object.join();merged=bpy.context.object;merged.name=c+' skinned surface'
        rig.select_set(True);root.select_set(True)
        # Export each assigned action through NLA tracks, with stable clip names.
        for t in rig.animation_data.nla_tracks:t.mute=False
        bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models'/f'{c}.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_all_influences=False,export_materials='EXPORT',export_extras=True,export_force_sampling=True)
        for t in rig.animation_data.nla_tracks:t.mute=True
        bpy.data.objects.remove(merged,do_unlink=True);root.location=old;root.scale=(1,1,1)
        report=reports[c];report['file']=f'assets/models/{c}.glb';p=ROOT/report['file'];report['bytes']=p.stat().st_size;report['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();report['reference_sha256']=hashlib.sha256(d['reference'].read_bytes()).hexdigest()
    (EVIDENCE/'model-audit.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));save_source();status('09 / Two independent GLB skins exported with deform rigs, four clips and embedded materials.')

def render_view(name,loc,target,scale,res=(1400,1000)):
    s=bpy.context.scene;cam=s.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.resolution_x=res[0];s.render.resolution_y=res[1];s.render.filepath=str(EVIDENCE/(name+'.png'));s.render.image_settings.file_format='PNG';bpy.ops.render.render(write_still=True)

def render_front():
    stop_preview();render_view('front',(0,-7,1.06),(0,0,1.06),3.8)

def render_final_walk():
    stop_preview()
    for d in CHARS.values():pose(d['rig'],'Walk',.25)
    render_view('walk-pose',(2.4,-7,2.0),(0,0,1),4.0)
    for d in CHARS.values():pose(d['rig'],'Idle',0)
    view(distance=4.5,rotation=(1.4,0,.2));save_source()

def render_review():
    stop_preview()
    render_view('three-quarter',(3,-7,2.8),(0,0,1),4.0)
    render_view('back',(0,7,1.08),(0,0,1.08),3.8)
    for c,d in CHARS.items():
        x=d['root'].location.x
        other=next(v for k,v in CHARS.items() if k!=c)
        for o in other['objects']:o.hide_render=True
        render_view(c+'-side',(x+6,0,1.0),(x,0,1.0),2.25,(850,1000))
        render_view(c+'-face',(x+.6,-4,1.88),(x,-.04,1.62),.82,(1000,1000))
        render_view(c+'-card',(x+.65,-4,1.7),(x,0,1.0),2.22,(480,520))
        bpy.data.images['Render Result'].save_render(str(ROOT/'assets/skins'/f'{c}.png'),scene=bpy.context.scene)
        for o in other['objects']:o.hide_render=False
    for c,d in CHARS.items():pose(d['rig'],'Walk',.25)
    render_view('walk-pose',(2.4,-7,2.0),(0,0,1),4.0)
    for c,d in CHARS.items():pose(d['rig'],'Idle',0)
    view(distance=4.5,rotation=(1.4,0,.2));save_source();status('10 / Front, back, side, face and walk review renders saved; wardrobe thumbnails ready.')
