"""Machine-readable failures shared by artifact merges and dispatch."""


class ArtifactFault(ValueError):
    def __init__(self, code, message, *, location='', sources=(), artifact=None,
                 target=None, category='artifact', svg_id=None):
        super().__init__(message)
        self.code = code
        self.location = location
        self.sources = tuple(sources)
        self.artifact = artifact
        self.target = target
        self.category = category
        self.svg_id = svg_id

    def context(self, *, sources=None, artifact=None, target=None):
        if sources is not None and not self.sources:
            self.sources = tuple(sources)
        if artifact is not None and self.artifact is None:
            self.artifact = artifact
        if target is not None and self.target is None:
            self.target = target
        return self


class MergeConflict(ArtifactFault):
    def __init__(self, location, sources):
        super().__init__('merge_conflict', f'conflicting changes at {location}',
                         location=location, sources=sources)
