"""Generate the article's four original, deterministic teaching figures.

Requires matplotlib. Run from the repository root; no model or API is used.
"""
from pathlib import Path
import math
from html import escape
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.ticker import PercentFormatter

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'learning'
OUT.mkdir(parents=True, exist_ok=True)
BG, PANEL, TEXT, MUTED = '#10232e', '#193441', '#e9dfcd', '#a5b6ba'
TEAL, CORAL, PURPLE = '#8bccce', '#ffaaa3', '#c9b0e4'
FONT = 'Segoe UI,Microsoft YaHei,sans-serif'
font_manager.fontManager.addfont('C:/Windows/Fonts/msyh.ttc')
plt.rcParams.update({'font.family': 'Microsoft YaHei', 'svg.fonttype': 'none', 'svg.hashsalt': 'attention-principles',
                     'figure.facecolor': BG, 'axes.facecolor': BG,
                     'text.color': TEXT, 'axes.labelcolor': TEXT,
                     'xtick.color': MUTED, 'ytick.color': MUTED,
                     'axes.edgecolor': '#4c6776', 'font.size': 12})

def weight(n, gap=5):
    return 1 / (1 + n * math.exp(-gap))

def svg_start(title, desc, height):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}" viewBox="0 0 1200 {height}" role="img" aria-labelledby="title desc">',
            f'<title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc>',
            '<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="m1 1 6 3-6 3" fill="none" stroke="#8bccce" stroke-width="1.5"/></marker></defs>',
            f'<rect width="1200" height="{height}" fill="{BG}"/>', f'<g font-family="{FONT}">']

def text(parts, x, y, value, size=23, color=TEXT, weight='400'):
    parts.append(f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}">{escape(value)}</text>')

def box(parts, x, y, w, h, color='#4c6776'):
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{PANEL}" stroke="{color}"/>')

def arrow(parts, x1, y1, x2, y2):
    parts.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{TEAL}" stroke-width="2" marker-end="url(#arrow)"/>')

def save(parts, name):
    (OUT / name).write_text('\n'.join(parts + ['</g></svg>'])+'\n', encoding='utf-8')

def softmax_steps():
    s = svg_start('Softmax 计算：指数、求和与归一化', '三个位置的分数为5、0、负2，指数总和149.5485，权重约99.2408%、0.6687%、0.0905%。', 680)
    text(s, 48, 64, 'Softmax：把一行分数转成权重', 32, weight='650')
    text(s, 48, 105, '单个 query、单个 head；三个位置是教学输入，不是真实文本的分词结果。', 20, MUTED)
    for x, label in [(48,'① 分数 s'),(340,'② 取指数 exp(s)'),(632,'③ 求总和 Z'),(924,'④ 除以 Z')]:
        box(s, x, 145, 228, 64)
        text(s, x+20, 186, label, 22, TEAL)
        if x < 924: arrow(s,x+240,177,x+274,177)
    for x, label in [(70,'位置'),(340,'s'),(590,'exp(s)'),(900,'a = exp(s) / Z')]:
        text(s,x,267,label,23,MUTED)
    vals=[5,0,-2]
    exps=[math.exp(v) for v in vals]
    z=sum(exps)
    for i,(v,ev) in enumerate(zip(vals,exps)):
        y=325+i*70
        text(s,70,y,f'位置 {i+1}',24)
        text(s,340,y,str(v),25)
        text(s,590,y,f'{ev:.6f}',25)
        text(s,900,y,f'{100*ev/z:.4f}%',25,TEAL if i==0 else TEXT)
    box(s,48,510,1104,110)
    text(s,73,550,f'Z = exp(5) + exp(0) + exp(−2) = {z:.6f}',25)
    text(s,73,592,'归一化后总和为 1；比较的是相对分数，不是绝对分数。',22,MUTED)
    save(s,'attention-softmax-steps.svg')

def qkv_flow():
    s=svg_start('Scaled Dot-Product Attention 的计算流程', 'Q与K计算分数，缩放、加mask、softmax形成权重，最后对V加权求和。', 825)
    text(s,48,64,'Attention：先计算匹配，再聚合内容',32,weight='650')
    text(s,48,104,'以下展示一行 query；dₖ = 2，mask = 0，温度 τ = 1。',20,MUTED)
    for x,title,value,explain in [(48,'Query · 当前查询','q = [√2, 0]','决定从哪些位置读取'),(430,'Key · 用于匹配','K = [[5,0], [0,1], [−2,0]]','与 q 点积形成分数'),(812,'Value · 待聚合内容','V = [[1,0], [0,1], [0,1]]','按权重组合成输出')]:
        box(s,x,148,340,136)
        text(s,x+20,185,title,23,TEAL)
        text(s,x+20,226,value,19)
        text(s,x+20,262,explain,18,MUTED)
    arrow(s,220,298,220,336);arrow(s,600,298,600,336)
    box(s,48,352,722,100)
    text(s,76,393,'qKᵀ / √dₖ = [5, 0, −2]',27)
    text(s,76,431,'除以 √dₖ 控制点积分数尺度；不是 token 数。',20,MUTED)
    arrow(s,410,466,410,504)
    box(s,48,520,722,100)
    text(s,76,559,'a = softmax([5, 0, −2])',27,TEAL)
    text(s,76,598,'≈ [0.992408, 0.006687, 0.000905]',25)
    s.append(f'<path d="M982 299V672H805" fill="none" stroke="{TEAL}" stroke-width="2" marker-end="url(#arrow)"/>')
    arrow(s,410,634,410,672)
    box(s,48,688,1104,88)
    text(s,76,725,'z = aV ≈ [0.992408, 0.007592]',29,CORAL)
    text(s,76,758,'权重是标量，输出是向量；V 的方向与大小同样影响输出。',20,MUTED)
    save(s,'attention-qkv-flow.svg')
    (OUT.parent/'images'/'attention-cover.svg').write_bytes((OUT/'attention-qkv-flow.svg').read_bytes())

def dilution_curve():
    fig, ax=plt.subplots(figsize=(12,6.8))
    fig.subplots_adjust(left=.10,right=.96,bottom=.22,top=.78)
    ns=[10**(4*i/300) for i in range(301)]
    for gap,color,style in [(2,PURPLE,'--'),(5,TEAL,'-'),(8,CORAL,'--')]:
        ax.plot(ns,[weight(n,gap) for n in ns],color=color,lw=2.6,ls=style,label=f'分数差 Δ = {gap}')
    for n in [10,100,1000,10000]:
        a=weight(n)
        ax.scatter([n],[a],color=TEAL,s=42,zorder=4)
        ax.annotate(f'{a:.2%}',(n,a),xytext=(-8,14),textcoords='offset points',ha='right',color=TEXT,fontsize=12)
    ax.set_xscale('log');ax.set_xlim(1,15000);ax.set_ylim(0,1.04)
    ax.set_xticks([1,10,100,1000,10000],labels=['1','10','100','1,000','10,000'])
    ax.yaxis.set_major_formatter(PercentFormatter(1))
    ax.set_xlabel('其它可见位置的数量 N（对数坐标）',labelpad=12)
    ax.set_ylabel('目标位置权重 a*',labelpad=12)
    ax.grid(alpha=.18,color=MUTED);ax.spines[['top','right']].set_visible(False)
    ax.legend(facecolor=PANEL,labelcolor=TEXT,edgecolor='#4c6776',loc='upper right',fontsize=11)
    fig.text(.06,.92,'固定分数差时，N 怎样改变权重',fontsize=23,weight='bold')
    fig.text(.06,.855,'单个 attention row；背景位置得分相同；所有 logits 固定；未 mask；τ = 1。',fontsize=12,color=MUTED)
    fig.text(.10,.095,'a* = 1 / (1 + N exp(−Δ))',fontsize=20,color=TEAL)
    fig.text(.10,.038,'这是受控数学实验，不是模型准确率曲线；真实上下文改变时 Q、K、V 也会变化。',fontsize=11,color=MUTED)
    fig.savefig(OUT/'attention-dilution-curve.svg',metadata={'Date':None});plt.close(fig)

def signal_vectors():
    fig,ax=plt.subplots(figsize=(12,7.2))
    fig.subplots_adjust(left=.09,right=.56,bottom=.27,top=.78)
    ax.plot([0,1],[1,0],color=MUTED,lw=1.4,ls='--')
    ax.annotate('',(1,0),(0,0),arrowprops={'arrowstyle':'->','color':TEAL,'lw':2.3})
    ax.annotate('',(0,1),(0,0),arrowprops={'arrowstyle':'->','color':CORAL,'lw':2.3})
    for i,(n,offset,color) in enumerate([(10,(-32,15),TEAL),(100,(12,8),'#8bcbef'),(1000,(15,-15),PURPLE),(10000,(15,12),CORAL)]):
        a=weight(n)
        ax.scatter([a],[1-a],s=65,color=color,zorder=4)
        ax.annotate(f'N = {n:,}',(a,1-a),xytext=offset,textcoords='offset points',fontsize=11,color=color)
        y=.65-.11*i
        fig.text(.61,y,f'N = {n:,}',fontsize=14,color=color)
        fig.text(.61,y-.04,f'z = [{a:.4f}, {1-a:.4f}]',fontsize=16,color=TEXT)
    ax.set_xlim(-.04,1.12);ax.set_ylim(-.04,1.12);ax.set_aspect('equal')
    ax.set_xlabel('第一维：目标方向分量',labelpad=12);ax.set_ylabel('第二维：背景方向分量',labelpad=12)
    ax.grid(alpha=.18,color=MUTED);ax.spines[['top','right']].set_visible(False)
    fig.text(.06,.93,'从权重变化，到输出向量变化',fontsize=23,weight='bold')
    fig.text(.06,.865,'教学设定：v* = [1,0]，所有背景 v = [0,1]，目标分数 5、背景 0。',fontsize=12,color=MUTED)
    fig.text(.61,.75,'加权输出 z',fontsize=18,weight='bold')
    fig.text(.10,.10,'z = a* [1,0] + (1 − a*) [0,1]',fontsize=19,color=TEAL)
    fig.text(.10,.04,'背景 V 在本例中同向，所以可合并；一般情形要逐项计算 Σ a[j]v[j]。',fontsize=11,color=MUTED)
    fig.savefig(OUT/'attention-signal-vectors.svg',metadata={'Date':None});plt.close(fig)

if __name__=='__main__':
    softmax_steps();qkv_flow();dilution_curve();signal_vectors()
    assert abs(weight(10000)-.014624272462681324)<1e-14
    print('Generated four attention figures.')
