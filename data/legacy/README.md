# Legacy data files

These files are kept for the record. The page no longer reads any of them.

- `Homininos_DataSet_original.csv` and `Homininos_DataSet_encoded.csv` are the Kaggle teaching dataset "Biological Data of Human Ancestors" (user santiago123678): 720 rows, 28 columns, one with text categories and one with those categories encoded as integers. The qualitative trait descriptors in `../species.json` were taken from the original.
- `Evolution_DataSets.csv` is a 12,000-row expansion of that dataset. Every species has exactly 500 rows, a one-million-year time span and a 300 cc cranial range, which marks it as randomly generated rather than measured. It drove the first release of this page and should not be used as a source for dates, brain sizes or heights.
- `first-release/species_data.json` and `species_data.min.json` are the per-species summaries the first release computed from that file.

The current dataset, with sources, is `../species.json`.
