package com.xiushuiguan.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.xiushuiguan.dto.GameResultDTO;
import com.xiushuiguan.entity.GameRecord;

public interface GameRecordService extends IService<GameRecord> {

    GameRecord submitResult(GameResultDTO dto);

    IPage<GameRecord> getRecords(Long userId, int page, int size);
}
