"""Copy the prototype's JSON data into Azure SQL.

Usage:
  pip install pyodbc
  python tools/load_to_sql.py --data ../site/data --conn "<ODBC connection string>"
  python tools/load_to_sql.py --data ../site/data --dry-run      (counts only, no database)

Run it with an admin login, after sql/schema.sql. It empties the tables and loads them again.
"""
import argparse, glob, json, os

def read(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def collect(data_dir):
    facilities = read(os.path.join(data_dir, 'facilities.json'))
    manifest = read(os.path.join(data_dir, 'pages.json'))
    fac = [(i, f['id'], f['name'], f.get('state', 'Kaduna'), f['lga'], f['ward'], f['area'], f['type'])
           for i, f in enumerate(facilities)]
    pages, cols, weeks, visits, vals = [], [], [], [], []
    for order, p in enumerate(manifest['pages']):
        d = read(os.path.join(data_dir, p['id'] + '.json'))
        pages.append((p['id'], d.get('title') or p['title'], p['sheet'], p['source'], p.get('note') or None, order))
        dflt = set(d.get('def') or [])
        for k, c in enumerate(d['cols']):
            cols.append((p['id'], k, c['g'], c.get('o') or '', c['k'], c['p'], 1 if k in dflt else 0))
        for wi, w in enumerate(d['weeks']):
            weeks.append((p['id'], wi, w))
        for r in d['rows']:
            visits.append((p['id'], r[0], r[1]))
            for k, v in enumerate(r[2:]):
                if v is not None:
                    vals.append((p['id'], r[0], r[1], k, float(v)))
        for r in d.get('r1') or []:
            visits.append((p['id'], r[0], -1))
            for k, v in enumerate(r[1:]):
                if v is not None:
                    vals.append((p['id'], r[0], -1, k, float(v)))
    off = [(o['title'], o['sheet'], o.get('note')) for o in manifest.get('off', [])]
    return dict(facilities=fac, pages=pages, off_pages=off, page_columns=cols,
                page_weeks=weeks, page_visits=visits, responses=vals)

INSERTS = {
    'facilities':   'INSERT INTO dbo.facilities (idx,id,name,state,lga,ward,residence,type) VALUES (?,?,?,?,?,?,?,?)',
    'pages':        'INSERT INTO dbo.pages (id,title,sheet,source,note,sort_order) VALUES (?,?,?,?,?,?)',
    'off_pages':    'INSERT INTO dbo.off_pages (title,sheet,note) VALUES (?,?,?)',
    'page_columns': 'INSERT INTO dbo.page_columns (page_id,k,grp,opt,kind,period,is_default) VALUES (?,?,?,?,?,?,?)',
    'page_weeks':   'INSERT INTO dbo.page_weeks (page_id,wi,label) VALUES (?,?,?)',
    'page_visits':  'INSERT INTO dbo.page_visits (page_id,facility_idx,wi) VALUES (?,?,?)',
    'responses':    'INSERT INTO dbo.responses (page_id,facility_idx,wi,k,value) VALUES (?,?,?,?,?)',
}
ORDER = ['facilities', 'pages', 'off_pages', 'page_columns', 'page_weeks', 'page_visits', 'responses']
CLEAR = ['responses', 'page_visits', 'page_weeks', 'page_columns', 'off_pages', 'pages', 'facilities']

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--conn')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    t = collect(a.data)
    for n in ORDER:
        print(f'{n:14s} {len(t[n]):>9,} rows')
    if a.dry_run:
        return
    if not a.conn:
        ap.error('--conn is required unless --dry-run')
    import pyodbc
    cn = pyodbc.connect(a.conn, autocommit=False)
    cur = cn.cursor()
    cur.fast_executemany = True
    for n in CLEAR:
        cur.execute('DELETE FROM dbo.' + n)
    for n in ORDER:
        rows = t[n]
        for i in range(0, len(rows), 50000):
            cur.executemany(INSERTS[n], rows[i:i + 50000])
        print('loaded', n)
    cn.commit()
    print('Done.')

if __name__ == '__main__':
    main()
