import yaml, json
d = yaml.safe_load(open('.github/workflows/ci.yml'))
blob = json.dumps(d).lower()
banned = ['continue-on-error', 'nick-fields/retry', 'retry-on', '|| true', 'set +e']
hits = [b for b in banned if b in blob]
print('hits:', hits)
assert not hits, hits
print('NO SUPPRESSION')
